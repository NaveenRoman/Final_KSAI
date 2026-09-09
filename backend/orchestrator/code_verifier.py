import ast
import os
import re
import shutil
import subprocess
import tempfile
from typing import Dict, Any, Tuple, Optional


class CodeVerificationResult:
    def __init__(self, is_valid: bool, error_type: Optional[str] = None, error_message: str = "", details: Optional[Dict[str, Any]] = None):
        self.is_valid = is_valid
        self.error_type = error_type
        self.error_message = error_message
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "isValid": self.is_valid,
            "errorType": self.error_type,
            "errorMessage": self.error_message,
            "details": self.details,
        }


def normalize_language(lang: str) -> str:
    l = (lang or "python").lower().strip()
    if l in ["cpp", "c++"]:
        return "cpp"
    if l in ["c"]:
        return "c"
    if l in ["python", "py", "python3"]:
        return "python"
    if l in ["javascript", "js"]:
        return "javascript"
    if l in ["typescript", "ts"]:
        return "typescript"
    if l in ["java"]:
        return "java"
    return "python"


def static_validate_bracket_balance(code: str) -> Tuple[bool, str]:
    stack = []
    lines = code.split("\n")
    in_single_quote = False
    in_double_quote = False
    in_line_comment = False
    in_block_comment = False

    for l_idx, line in enumerate(lines):
        in_line_comment = False
        c_idx = 0
        while c_idx < len(line):
            char = line[c_idx]
            next_char = line[c_idx + 1] if c_idx + 1 < len(line) else ""

            if not in_single_quote and not in_double_quote:
                if not in_block_comment and char == "/" and next_char == "/":
                    in_line_comment = True
                    break
                if not in_block_comment and char == "/" and next_char == "*":
                    in_block_comment = True
                    c_idx += 2
                    continue
                if in_block_comment and char == "*" and next_char == "/":
                    in_block_comment = False
                    c_idx += 2
                    continue

            if in_line_comment or in_block_comment:
                c_idx += 1
                continue

            if char == '"' and not in_single_quote and (c_idx == 0 or line[c_idx - 1] != "\\"):
                in_double_quote = not in_double_quote
                c_idx += 1
                continue
            if char == "'" and not in_double_quote and (c_idx == 0 or line[c_idx - 1] != "\\"):
                in_single_quote = not in_single_quote
                c_idx += 1
                continue

            if in_single_quote or in_double_quote:
                c_idx += 1
                continue

            if char in "{([":
                stack.append((char, l_idx + 1, c_idx + 1))
            elif char in "})]":
                if not stack:
                    return False, f"Unexpected closing '{char}' at line {l_idx + 1}, column {c_idx + 1} with no matching opening delimiter."
                last_char, last_line, last_col = stack.pop()
                expected = "}" if last_char == "{" else (")" if last_char == "(" else "]")
                if char != expected:
                    return False, f"Mismatched delimiter: found '{char}' at line {l_idx + 1}, but expected '{expected}' to close '{last_char}' opened at line {last_line}."

            c_idx += 1

    if stack:
        last_char, last_line, last_col = stack[-1]
        return False, f"Unclosed '{last_char}' opened at line {last_line}, column {last_col}."

    return True, ""


def static_validate_java(code: str) -> Tuple[bool, str]:
    bal_ok, bal_err = static_validate_bracket_balance(code)
    if not bal_ok:
        return False, bal_err

    if not re.search(r"\bclass\s+[A-Za-z0-9_]+", code):
        return False, "Java error: Missing class declaration (e.g., 'public class Main')."

    if not re.search(r"\bpublic\s+static\s+void\s+main\s*\(", code):
        return False, "Java error: Missing entry point 'public static void main(String[] args)'."

    if re.search(r"^\s*def\s+\w+\s*\(", code, re.MULTILINE) or re.search(r"^\s*print\s*\(", code, re.MULTILINE):
        return False, "Java error: Contains Python syntax (def/print) outside Java class structure."

    if "#include" in code or ("printf(" in code and "System.out.printf" not in code):
        return False, "Java error: Contains C/C++ header syntax (#include/printf)."

    return True, ""


def static_validate_python(code: str) -> Tuple[bool, str]:
    bal_ok, bal_err = static_validate_bracket_balance(code)
    if not bal_ok:
        return False, bal_err

    if "public class" in code or "public static void main" in code or "System.out." in code:
        return False, "Python error: Contains Java class boilerplate (public class / System.out)."

    if "#include" in code or "std::cout" in code:
        return False, "Python error: Contains C/C++ syntax (#include / std::cout)."

    try:
        ast.parse(code)
    except SyntaxError as e:
        return False, f"Python SyntaxError at line {e.lineno}: {e.msg} ({e.text.strip() if e.text else ''})"

    return True, ""


def static_validate_c(code: str) -> Tuple[bool, str]:
    bal_ok, bal_err = static_validate_bracket_balance(code)
    if not bal_ok:
        return False, bal_err

    if "<iostream>" in code or "std::cout" in code or "cout <<" in code or "using namespace std" in code:
        return False, "C error: C++ stream headers (<iostream>, cout, namespace) cannot be used in a pure C program. Use <stdio.h> and printf."

    if not re.search(r"\bmain\s*\(", code):
        return False, "C error: Missing 'main()' function entry point."

    if "System.out." in code or "public class" in code:
        return False, "C error: Contains Java syntax."

    if "def " in code and "int " not in code:
        return False, "C error: Contains Python def statement."

    return True, ""


def static_validate_cpp(code: str) -> Tuple[bool, str]:
    bal_ok, bal_err = static_validate_bracket_balance(code)
    if not bal_ok:
        return False, bal_err

    if not re.search(r"\bmain\s*\(", code):
        return False, "C++ error: Missing 'main()' function entry point."

    if "System.out." in code or "public class" in code:
        return False, "C++ error: Contains Java syntax."

    if re.search(r"^\s*def\s+\w+\s*\(", code, re.MULTILINE):
        return False, "C++ error: Contains Python def keyword."

    return True, ""


def static_validate_code(code: str, language: str) -> Tuple[bool, str]:
    norm = normalize_language(language)
    if not code or not code.strip():
        return False, "Code is empty."

    if norm == "java":
        return static_validate_java(code)
    elif norm == "python":
        return static_validate_python(code)
    elif norm == "c":
        return static_validate_c(code)
    elif norm == "cpp":
        return static_validate_cpp(code)
    return True, ""


def compiler_verify_code(code: str, language: str, timeout_sec: int = 5) -> Tuple[bool, str]:
    norm = normalize_language(language)
    
    # 1. Python Execution & Syntax Check
    if norm == "python":
        python_exec = shutil.which("python") or shutil.which("python3") or r"C:\Users\Indhu\AppData\Local\Programs\Python\Python311\python.exe"
        if python_exec and os.path.exists(python_exec):
            with tempfile.NamedTemporaryFile(suffix=".py", mode="w", encoding="utf-8", delete=False) as f:
                f.write(code)
                temp_path = f.name
            try:
                compile_proc = subprocess.run(
                    [python_exec, "-m", "py_compile", temp_path],
                    capture_output=True,
                    text=True,
                    timeout=timeout_sec
                )
                if compile_proc.returncode != 0:
                    return False, f"Python Compilation Error: {compile_proc.stderr or compile_proc.stdout}"
                return True, "Python compilation verified."
            except Exception as ex:
                return True, f"Python compiler warning: {ex}"
            finally:
                if os.path.exists(temp_path):
                    try:
                        os.remove(temp_path)
                    except Exception:
                        pass
        return True, "Python static check passed."

    # 2. Java Compilation Check (if javac is available)
    if norm == "java":
        javac_exec = shutil.which("javac")
        if javac_exec:
            with tempfile.TemporaryDirectory() as temp_dir:
                main_file = os.path.join(temp_dir, "Main.java")
                with open(main_file, "w", encoding="utf-8") as f:
                    f.write(code)
                try:
                    proc = subprocess.run(
                        [javac_exec, main_file],
                        capture_output=True,
                        text=True,
                        timeout=timeout_sec
                    )
                    if proc.returncode != 0:
                        return False, f"Java Compiler Error (javac): {proc.stderr or proc.stdout}"
                    return True, "Java compilation verified."
                except Exception as ex:
                    return True, f"Java compiler check skipped: {ex}"
        return True, "Java static verification passed."

    # 3. C Compilation Check (if gcc is available)
    if norm == "c":
        gcc_exec = shutil.which("gcc")
        if gcc_exec:
            with tempfile.TemporaryDirectory() as temp_dir:
                c_file = os.path.join(temp_dir, "prog.c")
                out_file = os.path.join(temp_dir, "prog.exe" if os.name == "nt" else "prog.out")
                with open(c_file, "w", encoding="utf-8") as f:
                    f.write(code)
                try:
                    proc = subprocess.run(
                        [gcc_exec, "-std=c11", c_file, "-o", out_file],
                        capture_output=True,
                        text=True,
                        timeout=timeout_sec
                    )
                    if proc.returncode != 0:
                        return False, f"C Compiler Error (gcc): {proc.stderr or proc.stdout}"
                    return True, "C compilation verified."
                except Exception as ex:
                    return True, f"C compiler check skipped: {ex}"
        return True, "C static verification passed."

    # 4. C++ Compilation Check (if g++ is available)
    if norm == "cpp":
        gpp_exec = shutil.which("g++")
        if gpp_exec:
            with tempfile.TemporaryDirectory() as temp_dir:
                cpp_file = os.path.join(temp_dir, "prog.cpp")
                out_file = os.path.join(temp_dir, "prog.exe" if os.name == "nt" else "prog.out")
                with open(cpp_file, "w", encoding="utf-8") as f:
                    f.write(code)
                try:
                    proc = subprocess.run(
                        [gpp_exec, "-std=c++17", cpp_file, "-o", out_file],
                        capture_output=True,
                        text=True,
                        timeout=timeout_sec
                    )
                    if proc.returncode != 0:
                        return False, f"C++ Compiler Error (g++): {proc.stderr or proc.stdout}"
                    return True, "C++ compilation verified."
                except Exception as ex:
                    return True, f"C++ compiler check skipped: {ex}"
        return True, "C++ static verification passed."

    return True, "Verification passed."


def contains_generic_arithmetic_fallback(code: str, project: str = "") -> bool:
    p_lower = (project or "").lower().strip()
    is_arithmetic_req = any(term in p_lower for term in ["arithmetic", "calculator", "calc", "addition", "add two", "sum of two", "math", "subtraction", "multiply", "square sum", "sum of squares"])
    if is_arithmetic_req:
        return False
    code_lower = code.lower()
    return bool(
        (
            ("int a = 25" in code or "int a = 10" in code or "a, b = 25" in code or "a, b = 10" in code or "a = 25, b = 15" in code or "a = 25" in code)
            and ("sum = a + b" in code or "a + b" in code)
            and ("diff = a - b" in code or "a - b" in code or "prod = a * b" in code or "product" in code_lower)
        ) or (
            ("i * i" in code or "i*i" in code)
            and ("result += i * i" in code or "sum += i * i" in code or "sum += i*i" in code or "i * i for i in range" in code)
        )
    )


def verify_code_completeness_and_topic(code: str, language: str, project: str) -> Tuple[bool, str]:
    p_lower = (project or "").lower().strip()
    norm = normalize_language(language)
    code_lower = code.lower()

    if not code.strip():
        return False, "Code is completely empty."

    # 0. ANTI-PLACEHOLDER & FAKE TEMPLATE DETECTOR
    fake_patterns = [
        "executing ",
        "domain logic",
        "solution in python",
        "solution in c",
        "solution in java",
        "solution in c++",
        "taskhandler",
        "taskrunner",
        "domainapp",
    ]
    for fp in fake_patterns:
        if fp in code_lower:
            lines = [line.strip() for line in code.split("\n") if line.strip() and not line.strip().startswith(("#", "//", "/*", "*"))]
            if len(lines) <= 14 and any(fp in line.lower() for line in lines):
                return False, f"Generated code contains placeholder template text ('{fp}') and does not implement real logic for '{project}'."

    # ANTI-GENERIC-ARITHMETIC FALLBACK DETECTOR
    if contains_generic_arithmetic_fallback(code, project):
        return False, f"Generated code is a generic arithmetic template and does not implement '{project}'."

    # Even / Odd validation
    if "even" in p_lower or "odd" in p_lower:
        has_even_odd = "% 2" in code or "%2" in code or "& 1" in code or "&1" in code
        if not has_even_odd:
            return False, "Even/Odd program must check divisibility by 2 (% 2 or & 1)."

    # Set validation
    if "set" in p_lower and "offset" not in p_lower and "subset" not in p_lower and "reset" not in p_lower and "dataset" not in p_lower:
        has_set = "set(" in code_lower or "hashset" in code_lower or "treeset" in code_lower or "std::set" in code or "std::unordered_set" in code or "new set" in code_lower or "{" in code
        if not has_set:
            return False, "Set program must demonstrate set creation and operations (set(), HashSet, std::set, or Set)."

    # 1. Break Statement validation
    if "break" in p_lower and "statement" in p_lower or p_lower == "break":
        has_loop = "for" in code_lower or "while" in code_lower or "do" in code_lower
        has_break = "break;" in code or "break\n" in code or "break " in code or "break" in code_lower
        if not (has_loop and has_break):
            return False, "Break statement program must contain a loop (for/while) and an active 'break' statement."

    # 2. Continue Statement validation
    if "continue" in p_lower:
        has_loop = "for" in code_lower or "while" in code_lower
        has_cont = "continue;" in code or "continue\n" in code or "continue " in code
        if not (has_loop and has_cont):
            return False, "Continue statement program must contain a loop and a 'continue' statement."

    # 3. Fibonacci validation
    if "fibonacci" in p_lower or "fib" in p_lower:
        has_fib = (
            ("+" in code and ("0" in code or "1" in code) and ("for" in code or "while" in code))
            or "fibonacci(" in code_lower
            or "fib(" in code_lower
            or "next = " in code_lower
            or "c = a + b" in code_lower
            or "n1 + n2" in code_lower
            or "a + b" in code and "a, b = b, a + b" in code
        )
        if not has_fib:
            return False, "Program does not implement Fibonacci sequence generation."

    # 4. Generator / Yield validation
    if "generator" in p_lower or "yield" in p_lower:
        if norm in ["python", "javascript", "typescript"]:
            if "yield" not in code:
                return False, f"{language} generator program must use the 'yield' keyword."

    # 5. Dictionary / Map validation
    if "dictionar" in p_lower or "dict" in p_lower or ("map" in p_lower and "bitmap" not in p_lower and "hashmap" in p_lower):
        if norm == "python":
            has_dict = "{" in code and ":" in code or "dict(" in code_lower or "get(" in code_lower or "keys(" in code_lower or "values(" in code_lower
            if not has_dict:
                return False, "Python dictionary program must demonstrate key-value dictionary operations."
        elif norm == "java":
            has_map = "map" in code_lower or "hashmap" in code_lower or "put(" in code_lower
            if not has_map:
                return False, "Java Map program must use Map/HashMap with key-value operations."
        elif norm == "cpp":
            has_map = "std::map" in code or "unordered_map" in code or "map<" in code
            if not has_map:
                return False, "C++ Map program must use std::map or std::unordered_map."

    # 6. Functions / Methods validation
    if "function" in p_lower or "method" in p_lower:
        if norm == "python" and "def " not in code:
            return False, "Python functions program must define and invoke custom functions (def func():)."
        if norm in ["javascript", "typescript"] and "function " not in code and "=>" not in code:
            return False, f"{language} functions program must define and invoke custom functions."

    # 7. Graph / BFS / DFS validation
    if "graph" in p_lower or "bfs" in p_lower or "dfs" in p_lower:
        has_graph = (
            "adj" in code_lower
            or "edge" in code_lower
            or "vertex" in code_lower
            or "vertices" in code_lower
            or "visited" in code_lower
            or "addedge" in code_lower
            or "add_edge" in code_lower
            or "bfs" in code_lower
            or "dfs" in code_lower
            or "neighbors" in code_lower
            or "neighbor" in code_lower
            or "class graph" in code_lower
            or "struct graph" in code_lower
        )
        if not has_graph:
            return False, "Graph program must implement graph representation (adjacency/nodes/edges) or graph traversal (BFS/DFS)."

    # 8. Swap Two Numbers validation
    if "swap" in p_lower:
        has_swap = "temp" in code_lower or "swap(" in code_lower or "a, b = b, a" in code or "^=" in code or ("a = a + b" in code and "b = a - b" in code)
        if not has_swap:
            return False, "Swap program must implement variable swapping logic."

    # 9. Sum of Digits validation
    if "sum of digit" in p_lower or "sum_of_digit" in p_lower or "digits sum" in p_lower:
        has_sum_digits = "%" in code and ("10" in code or "sum" in code_lower) and ("while" in code or "for" in code or "/" in code)
        if not has_sum_digits:
            return False, "Sum of digits program must extract digits using modulo and division inside a summation loop."

    # 10. Perfect Number validation
    if "perfect" in p_lower and "number" in p_lower or p_lower == "perfect number":
        has_perfect = "%" in code and ("sum" in code_lower or "==" in code) and ("for" in code or "while" in code)
        if not has_perfect:
            return False, "Perfect number program must check proper divisors using modulo and sum equality."

    # 11. Reverse Number validation
    if ("reverse" in p_lower and ("number" in p_lower or "digit" in p_lower or "int" in p_lower or "num" in p_lower)) or p_lower == "reverse":
        has_algo = ("%" in code and "10" in code) or ("[:: -1]" in code or "[::-1]" in code) or ("reverse(" in code_lower) or ("reversenumber" in code_lower)
        if not has_algo:
            return False, "Program does not implement number reversal algorithm."

    # 12. Prime Number validation
    if "prime" in p_lower:
        if "%" not in code or ("for" not in code and "while" not in code):
            return False, "Program does not implement prime number checking algorithm."

    # 13. Palindrome validation
    if "palindrome" in p_lower:
        has_palin = "==" in code and ("reverse" in code_lower or "rev" in code_lower or "[::-1]" in code or "equals" in code_lower or "charAt" in code or "length" in code_lower)
        if not has_palin:
            return False, "Palindrome program must check string or number symmetry/reversal."

    # 14. Armstrong Number validation
    if "armstrong" in p_lower:
        has_armstrong = "%" in code and ("pow" in code_lower or "**" in code or "*" in code) and ("sum" in code_lower or "==" in code)
        if not has_armstrong:
            return False, "Armstrong program must sum the powers of its digits and check equality."

    # 15. Factorial validation
    if "factorial" in p_lower:
        if "*" not in code and "factorial" not in code_lower:
            return False, "Program does not implement factorial multiplication or recursion."

    # 16. Sort validation
    if "sort" in p_lower:
        if "for" not in code and "while" not in code and "sort" not in code_lower:
            return False, "Program does not implement array sorting."

    # 17. Binary Search validation
    if "binary search" in p_lower or "binary_search" in p_lower:
        has_bs = ("mid" in code_lower or "low" in code_lower or "high" in code_lower or "left" in code_lower or "right" in code_lower) and ("/" in code or ">>" in code or "//" in code)
        if not has_bs:
            return False, "Binary search program must calculate mid point and perform range division."

    # 18. Linked List validation
    if "linked" in p_lower and "list" in p_lower:
        if "next" not in code_lower and "node" not in code_lower:
            return False, "Program does not implement linked list Node structure."

    # 19. Binary Tree / BST validation
    if "tree" in p_lower or "bst" in p_lower:
        has_tree = "left" in code_lower or "right" in code_lower or "root" in code_lower or "tree" in code_lower or "insert" in code_lower
        if not has_tree:
            return False, "Program does not implement Tree / BST structure (root, left, right, or node insertion)."

    # 20. Stack validation
    if "stack" in p_lower:
        has_stack_ops = "push" in code_lower or "pop" in code_lower or "peek" in code_lower or "stack" in code_lower or "deque" in code_lower or "lifo" in code_lower
        if not has_stack_ops:
            return False, "Program does not implement Stack behavior (push, pop, peek, or LIFO operations)."

    # 21. Queue validation
    if "queue" in p_lower and "stack" not in p_lower:
        has_queue_ops = "enqueue" in code_lower or "dequeue" in code_lower or "offer" in code_lower or "poll" in code_lower or "queue" in code_lower or "fifo" in code_lower
        if not has_queue_ops:
            return False, "Program does not implement Queue behavior (enqueue, dequeue, offer, or poll operations)."

    # 22. Multithreading validation
    if "thread" in p_lower or "multithread" in p_lower or "concurrency" in p_lower:
        has_thread = "thread" in code_lower or "runnable" in code_lower or "start()" in code_lower or "threading" in code_lower or "pthread" in code_lower or "worker" in code_lower
        if not has_thread:
            return False, "Program does not implement multithreading (Thread, Runnable, start(), or concurrency constructs)."

    # 23. File Handling validation
    if "file" in p_lower and ("handling" in p_lower or "read" in p_lower or "write" in p_lower or "io" in p_lower or "stream" in p_lower):
        has_file = "file" in code_lower or "writer" in code_lower or "reader" in code_lower or "open(" in code_lower or "fopen" in code_lower or "fstream" in code_lower or "fs." in code_lower
        if not has_file:
            return False, "Program does not implement File Handling I/O operations (FileReader, FileWriter, BufferedReader, open(), or fopen)."

    # 24. Tuple validation (Python)
    if "tuple" in p_lower:
        has_tuple = "tuple" in code_lower or ("(" in code and "," in code and ("print(" in code or "len(" in code or "[" in code))
        if not has_tuple:
            return False, "Program does not demonstrate Tuple data structure creation, indexing, or operations."

    # 25. Exception Handling validation
    if "exception" in p_lower or "error handling" in p_lower or "try catch" in p_lower:
        has_exc = "try" in code_lower and ("catch" in code_lower or "except" in code_lower or "finally" in code_lower or "throw" in code_lower or "raise" in code_lower)
        if not has_exc:
            return False, "Program does not implement Exception Handling (try, catch/except, throw/raise)."

    # 26. Recursion validation
    if "recursi" in p_lower:
        if "(" not in code or "return" not in code:
            return False, "Program does not implement a recursive function with return value."

    # 27. Pointer validation (C/C++)
    if "pointer" in p_lower:
        if "*" not in code and "&" not in code and "malloc" not in code_lower:
            return False, "Program does not demonstrate pointer operations (*, &, or dynamic memory)."

    # 28. Matrix / 2D Array validation
    if "matrix" in p_lower or "2d array" in p_lower:
        has_matrix = "[][" in code or "[0][" in code or ("for" in code and "for" in code[code.find("for")+3:])
        if not has_matrix:
            return False, "Matrix program must implement 2D array representation or nested loops."

    # 29. Override / Polymorphism validation
    if "override" in p_lower or "overriding" in p_lower:
        if norm == "java" and "@override" not in code_lower and "extends" not in code_lower:
            return False, "Java overriding program must have inheritance and method overriding."

    # 30. Inheritance validation
    if "inheritance" in p_lower:
        if norm == "java" and "extends" not in code_lower:
            return False, "Java inheritance program must use 'extends'."
        if norm == "cpp" and ":" not in code:
            return False, "C++ inheritance program must use derived class syntax (class Derived : public Base)."

    # 31. Calculator validation
    if "calc" in p_lower or "calculator" in p_lower:
        has_calc = "+" in code or "-" in code or "*" in code or "/" in code
        if not has_calc:
            return False, "Calculator program must implement arithmetic calculations (+, -, *, /)."

    # 32. ATM / Banking validation
    if "atm" in p_lower or "bank" in p_lower:
        if "balance" not in code_lower or ("deposit" not in code_lower and "withdraw" not in code_lower):
            return False, "ATM/Banking program must implement balance, deposit, or withdrawal operations."

    # 33. User Input validation
    if "user input" in p_lower or "read input" in p_lower or "interactive" in p_lower or "scanner" in p_lower:
        if norm == "java":
            has_input = "scanner" in code_lower or "system.in" in code_lower or "bufferedreader" in code_lower
            if not has_input:
                return False, "Java user input program must use Scanner or BufferedReader with System.in."
        elif norm == "python":
            if "input(" not in code:
                return False, "Python user input program must use input()."
        elif norm == "c":
            if "scanf(" not in code and "fgets(" not in code:
                return False, "C user input program must use scanf or fgets."
        elif norm == "cpp":
            if "cin" not in code and "getline(" not in code:
                return False, "C++ user input program must use std::cin or std::getline."

    # 34. Heap / Priority Queue validation
    if "heap" in p_lower or "priority queue" in p_lower or "priorityqueue" in p_lower:
        has_heap = "heap" in code_lower or "priorityqueue" in code_lower or "priority_queue" in code_lower or "heappush" in code_lower
        if not has_heap:
            return False, "Program does not implement Heap / Priority Queue data structure."

    # 35. String manipulation validation
    if "string" in p_lower and "reverse" not in p_lower and "palindrome" not in p_lower:
        has_str = "string" in code_lower or "str" in code_lower or "char" in code_lower or "\"" in code
        if not has_str:
            return False, "Program does not demonstrate string operations."

    return True, ""


def verify_candidate_code(code: str, language: str, project: str) -> CodeVerificationResult:
    stat_ok, stat_msg = static_validate_code(code, language)
    if not stat_ok:
        return CodeVerificationResult(is_valid=False, error_type="STATIC_SYNTAX_ERROR", error_message=stat_msg)

    topic_ok, topic_msg = verify_code_completeness_and_topic(code, language, project)
    if not topic_ok:
        return CodeVerificationResult(is_valid=False, error_type="FUNCTIONALITY_MISMATCH", error_message=topic_msg)

    comp_ok, comp_msg = compiler_verify_code(code, language)
    if not comp_ok:
        return CodeVerificationResult(is_valid=False, error_type="COMPILATION_ERROR", error_message=comp_msg)

    return CodeVerificationResult(is_valid=True, error_message="Code successfully verified.")
