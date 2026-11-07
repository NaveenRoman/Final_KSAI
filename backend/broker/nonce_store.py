"""
Codexa Persistent Nonce Store for Replay Prevention.
Combines an in-memory sliding window cache with an append-only Write-Ahead Log (WAL)
to ensure nonces cannot be replayed across broker restarts.
"""

import os
import time
import collections
from typing import Optional, Tuple

MAX_NONCE_ENTRIES = 50000
NONCE_TTL_SECONDS = 60.0  # Nonces are retained for 60s (longer than the 30s max drift)
DEFAULT_COMPACTION_THRESHOLD = 500


class NonceStore:
    def __init__(self, wal_path: Optional[str] = None, compaction_threshold: int = DEFAULT_COMPACTION_THRESHOLD):
        self.wal_path = wal_path
        self._compaction_threshold = compaction_threshold
        self._appended_count = 0
        self._active_nonces = collections.OrderedDict()  # nonce -> expiry_epoch (float)
        self.startup_epoch = time.time()
        self._wal_file = None

        if self.wal_path:
            # Ensure parent directory exists
            os.makedirs(os.path.dirname(os.path.abspath(self.wal_path)), exist_ok=True)
            self._recover_and_compact_wal()
            # Open WAL for appending with restricted permissions
            self._wal_file = open(self.wal_path, "a", encoding="utf-8")
            self._set_restrictive_permissions(self.wal_path)

    @staticmethod
    def _set_restrictive_permissions(path: str) -> None:
        """Applies 0600 (read/write only by owner) where supported."""
        try:
            if os.name != "nt" and os.path.exists(path):
                os.chmod(path, 0o600)
        except Exception:
            pass

    def _compact_wal_atomically(self, active_entries: list) -> None:
        """Atomically compacts WAL using a temporary file, fsync, and atomic rename."""
        if not self.wal_path:
            return
        tmp_path = f"{self.wal_path}.tmp.{os.getpid()}_{int(time.time()*1000)}"
        try:
            with open(tmp_path, "w", encoding="utf-8") as f:
                self._set_restrictive_permissions(tmp_path)
                for expiry, nonce in active_entries:
                    f.write(f"{expiry:.2f} {nonce}\n")
                f.flush()
                try:
                    os.fsync(f.fileno())
                except (AttributeError, OSError):
                    pass
            # Atomic replace guarantees zero torn writes or 0-byte truncated file
            os.replace(tmp_path, self.wal_path)
            self._set_restrictive_permissions(self.wal_path)
        except Exception:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass

    def _recover_and_compact_wal(self) -> None:
        """Reads existing nonces from WAL on startup and discards expired entries."""
        if not self.wal_path or not os.path.exists(self.wal_path):
            return

        now = time.time()
        recovered = []
        try:
            with open(self.wal_path, "r", encoding="utf-8") as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) == 2:
                        try:
                            expiry = float(parts[0])
                            nonce = parts[1]
                            if expiry > now:
                                self._active_nonces[nonce] = expiry
                                recovered.append((expiry, nonce))
                        except ValueError:
                            continue
        except Exception:
            pass

        # Atomic compaction retains unexpired nonces without truncation risk
        self._compact_wal_atomically(recovered)

    def _runtime_compact_wal(self, current_time: float) -> None:
        """Safely compacts the WAL during runtime without interrupting active nonces."""
        if not self.wal_path:
            return
        if self._wal_file and not self._wal_file.closed:
            try:
                self._wal_file.flush()
                try:
                    os.fsync(self._wal_file.fileno())
                except (AttributeError, OSError):
                    pass
                self._wal_file.close()
            except Exception:
                pass
            self._wal_file = None

        unexpired = [
            (exp, n) for n, exp in self._active_nonces.items() if exp > current_time
        ]
        self._compact_wal_atomically(unexpired)
        self._wal_file = open(self.wal_path, "a", encoding="utf-8")
        self._set_restrictive_permissions(self.wal_path)
        self._appended_count = 0

    def check_and_record(self, nonce: str, now: Optional[float] = None) -> Tuple[bool, Optional[str]]:
        """
        Atomically checks if nonce exists. If not seen, records it with expiry.
        Returns (True, None) if nonce was fresh and recorded.
        Returns (False, "REPLAY_DETECTED") if nonce was already seen.
        """
        current_time = time.time() if now is None else now
        self._evict_expired(current_time)

        if nonce in self._active_nonces:
            return False, "REPLAY_DETECTED: Nonce has already been consumed."

        # Cap memory size
        if len(self._active_nonces) >= MAX_NONCE_ENTRIES:
            self._active_nonces.popitem(last=False)

        expiry = current_time + NONCE_TTL_SECONDS
        self._active_nonces[nonce] = expiry

        # Append to persistent WAL with fsync durability
        if self._wal_file and not self._wal_file.closed:
            try:
                self._wal_file.write(f"{expiry:.2f} {nonce}\n")
                self._wal_file.flush()
                try:
                    os.fsync(self._wal_file.fileno())
                except (AttributeError, OSError):
                    pass
                self._appended_count += 1
            except Exception:
                pass

        # Trigger runtime compaction if threshold reached
        if self._appended_count >= self._compaction_threshold:
            self._runtime_compact_wal(current_time)

        return True, None

    def _evict_expired(self, current_time: float) -> None:
        """Removes expired entries from the in-memory OrderedDict."""
        while self._active_nonces:
            first_nonce, first_expiry = next(iter(self._active_nonces.items()))
            if first_expiry < current_time:
                del self._active_nonces[first_nonce]
            else:
                break

    def close(self) -> None:
        """Flushes, fsyncs, and closes WAL file."""
        if self._wal_file and not self._wal_file.closed:
            try:
                self._wal_file.flush()
                try:
                    os.fsync(self._wal_file.fileno())
                except (AttributeError, OSError):
                    pass
                self._wal_file.close()
            except Exception:
                pass
            self._wal_file = None
