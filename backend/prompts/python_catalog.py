# -*- coding: utf-8 -*-
"""
Codenthra AI Dictator - Dedicated Python 9-Tier Pedagogical Engine
Provides 9 structurally, algorithmically, and architecturally distinct implementations
for ANY Python topic across:
- 3 Categories: BEGINNER, INTERMEDIATE, ADVANCED
- 3 Practice Levels: LEVEL 1, LEVEL 2, LEVEL 3

Total: 9 unique programs per topic.
ZERO generic arithmetic fallback.
100% Valid, runnable Python 3 code with standard entrypoint (if __name__ == '__main__': main()).
"""

import re
import html
from typing import Dict, List, Tuple, Any, Optional

def normalize_python_topic(project: str) -> str:
    p = (project or "").lower().strip()
    if "stack" in p: return "stack"
    if "queue" in p: return "queue"
    if "linked" in p and "list" in p: return "linked_list"
    if any(term in p for term in ["thread", "concurren", "async", "lock"]): return "multithreading"
    if any(term in p for term in ["exception", "error", "try", "except"]): return "exception_handling"
    if "recursi" in p: return "recursion"
    if any(term in p for term in ["loop", "for loop", "while", "iterat"]): return "loop"
    if any(term in p for term in ["function", "def ", "method", "param", "lambda"]): return "function"
    if bool(re.search(r"\boops?\b", p)) or any(term in p for term in ["class", "object", "inherit", "polymorph", "encapsul"]): return "oop"
    if any(term in p for term in ["dict", "hashmap", "mapping", "key-value", "key_value"]): return "dictionary"
    if "tuple" in p: return "tuple"
    if bool(re.search(r"\bsets?\b", p)): return "set"
    if "file" in p or "csv" in p or "json" in p or bool(re.search(r"\b(io|read|write)\b", p)): return "file_handling"
    if any(term in p for term in ["array", "list"]): return "list"
    if "search" in p and "tree" not in p: return "searching"
    if "sort" in p: return "sorting"
    if bool(re.search(r"\b(database|sql|sqlite|db)\b", p)): return "database"
    if any(term in p for term in ["api", "http", "rest", "endpoint"]): return "api"
    return "dynamic_topic"

# =========================================================================
# 1. STACK (9 GENUINELY DIFFERENT PYTHON PROGRAMS)
# =========================================================================

def get_python_stack(category: str, sub_lvl: str) -> Tuple[str, List[str], str]:
    if category == "beginner":
        if sub_lvl == "1":
            code = (
                "def main():\n"
                "    stack = []\n"
                "    print('=== Python Stack Push and Pop (Beginner L1) ===')\n"
                "    stack.append(10)\n"
                "    stack.append(20)\n"
                "    stack.append(30)\n"
                "    print('Current stack:', stack)\n"
                "    print('Top element (peek):', stack[-1])\n"
                "    popped = stack.pop()\n"
                "    print('Popped element:', popped)\n"
                "    print('Remaining stack:', stack)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Stack Push and Pop", ["List Stack Init", "Append (Push)", "Peek with Indexing", "Pop (LIFO)"], code
        elif sub_lvl == "2":
            code = (
                "def main():\n"
                "    undo_history = []\n"
                "    print('=== Text Editor Undo Stack (Beginner L2) ===')\n"
                "    undo_history.append(\"Type 'Hello'\")\n"
                "    undo_history.append(\"Type 'World'\")\n"
                "    print('History depth:', len(undo_history))\n"
                "    print('Last action (peek):', undo_history[-1] if undo_history else 'None')\n"
                "    action = undo_history.pop()\n"
                "    print('Undoing action:', action)\n"
                "    print('Is history empty?', len(undo_history) == 0)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Stack Inspection & Undo", ["History Stack", "Append Actions", "State Queries (len/empty)", "LIFO Undo Action"], code
        else: # L3
            code = (
                "def reverse_string(text: str) -> str:\n"
                "    char_stack = []\n"
                "    for ch in text:\n"
                "        char_stack.append(ch)\n"
                "    reversed_chars = []\n"
                "    while char_stack:\n"
                "        reversed_chars.append(char_stack.pop())\n"
                "    return ''.join(reversed_chars)\n\n"
                "def main():\n"
                "    print('=== String Reversal using Stack (Beginner L3) ===')\n"
                "    word = 'KnowledgeStream'\n"
                "    result = reverse_string(word)\n"
                "    print('Original:', word)\n"
                "    print('Reversed:', result)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "String Reversal using Stack", ["Character Pushing", "LIFO Reversal Loop", "Result Assembly", "Demonstration"], code
    elif category == "intermediate":
        if sub_lvl == "1":
            code = (
                "class ArrayStack:\n"
                "    def __init__(self, capacity: int):\n"
                "        self._data = [None] * capacity\n"
                "        self._capacity = capacity\n"
                "        self._top = -1\n\n"
                "    def push(self, val):\n"
                "        if self._top == self._capacity - 1:\n"
                "            raise OverflowError('Stack Overflow: maximum capacity reached')\n"
                "        self._top += 1\n"
                "        self._data[self._top] = val\n\n"
                "    def pop(self):\n"
                "        if self.is_empty():\n"
                "            raise IndexError('Stack Underflow: cannot pop from empty stack')\n"
                "        val = self._data[self._top]\n"
                "        self._data[self._top] = None\n"
                "        self._top -= 1\n"
                "        return val\n\n"
                "    def peek(self):\n"
                "        if self.is_empty():\n"
                "            raise IndexError('Stack is empty')\n"
                "        return self._data[self._top]\n\n"
                "    def is_empty(self) -> bool:\n"
                "        return self._top == -1\n\n"
                "    def size(self) -> int:\n"
                "        return self._top + 1\n\n"
                "def main():\n"
                "    print('=== Custom Array-Based Stack (Intermediate L1) ===')\n"
                "    stack = ArrayStack(5)\n"
                "    stack.push(100)\n"
                "    stack.push(200)\n"
                "    stack.push(300)\n"
                "    print('Stack size:', stack.size())\n"
                "    print('Top element:', stack.peek())\n"
                "    print('Popped element:', stack.pop())\n"
                "    print('New top element:', stack.peek())\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Custom ArrayStack Class", ["Class & Buffer Definition", "Push with Overflow Guard", "Pop with Underflow Guard", "State Inspection"], code
        elif sub_lvl == "2":
            code = (
                "def is_balanced(expression: str) -> bool:\n"
                "    opening_brackets = {'(': ')', '{': '}', '[': ']'}\n"
                "    closing_brackets = {')', '}', ']'}\n"
                "    stack = []\n"
                "    for char in expression:\n"
                "        if char in opening_brackets:\n"
                "            stack.append(char)\n"
                "        elif char in closing_brackets:\n"
                "            if not stack:\n"
                "                return False\n"
                "            top = stack.pop()\n"
                "            if opening_brackets[top] != char:\n"
                "                return False\n"
                "    return len(stack) == 0\n\n"
                "def main():\n"
                "    print('=== Balanced Parentheses Checker (Intermediate L2) ===')\n"
                "    test_cases = ['{[()]}', '{[(])}', '((()))', '[{()}]', '(()']\n"
                "    for expr in test_cases:\n"
                "        result = is_balanced(expr)\n"
                "        print(f'{expr:10} -> Balanced: {result}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Balanced Parentheses Checker", ["Bracket Mapping", "Push Opening Delimiters", "Match & Pop Closings", "Empty Stack Validation"], code
        else: # L3
            code = (
                "def evaluate_postfix(expression: str) -> int:\n"
                "    stack = []\n"
                "    for token in expression.split():\n"
                "        if token in {'+', '-', '*', '/'}:\n"
                "            b = stack.pop()\n"
                "            a = stack.pop()\n"
                "            if token == '+': stack.append(a + b)\n"
                "            elif token == '-': stack.append(a - b)\n"
                "            elif token == '*': stack.append(a * b)\n"
                "            elif token == '/': stack.append(int(a / b))\n"
                "        else:\n"
                "            stack.append(int(token))\n"
                "    return stack.pop()\n\n"
                "def main():\n"
                "    print('=== Postfix (RPN) Expression Evaluator (Intermediate L3) ===')\n"
                "    expr = '5 3 + 2 * 4 -'\n"
                "    result = evaluate_postfix(expr)\n"
                "    print('Postfix Expression:', expr)\n"
                "    print('Evaluated Result  :', result)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Postfix RPN Evaluator", ["Token Parsing", "Operand Stacking", "Operator Evaluation", "Final Reduction"], code
    else: # advanced
        if sub_lvl == "1":
            code = (
                "class MinStack:\n"
                "    def __init__(self):\n"
                "        self._val_stack = []\n"
                "        self._min_stack = []\n\n"
                "    def push(self, val: int) -> None:\n"
                "        self._val_stack.append(val)\n"
                "        if not self._min_stack or val <= self._min_stack[-1]:\n"
                "            self._min_stack.append(val)\n\n"
                "    def pop(self) -> int:\n"
                "        if not self._val_stack:\n"
                "            raise IndexError('pop from empty MinStack')\n"
                "        val = self._val_stack.pop()\n"
                "        if val == self._min_stack[-1]:\n"
                "            self._min_stack.pop()\n"
                "        return val\n\n"
                "    def top(self) -> int:\n"
                "        return self._val_stack[-1]\n\n"
                "    def get_min(self) -> int:\n"
                "        if not self._min_stack:\n"
                "            raise IndexError('get_min from empty MinStack')\n"
                "        return self._min_stack[-1]\n\n"
                "def main():\n"
                "    print('=== Constant Time O(1) MinStack (Advanced L1) ===')\n"
                "    ms = MinStack()\n"
                "    for num in [15, 10, 20, 8, 25]:\n"
                "        ms.push(num)\n"
                "        print(f'Pushed {num:2d} | Current Minimum: {ms.get_min()}')\n"
                "    print('Popped top:', ms.pop())\n"
                "    print('Minimum after pop:', ms.get_min())\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Constant Time MinStack", ["Dual Stack Storage", "Synchronized Min Push", "Coordinated Min Pop", "O(1) Retrieval"], code
        elif sub_lvl == "2":
            code = (
                "def precedence(op: str) -> int:\n"
                "    if op in {'+', '-'}: return 1\n"
                "    if op in {'*', '/'}: return 2\n"
                "    if op == '^': return 3\n"
                "    return 0\n\n"
                "def infix_to_postfix(expression: str) -> str:\n"
                "    stack = []\n"
                "    output = []\n"
                "    for char in expression:\n"
                "        if char.isalnum():\n"
                "            output.append(char)\n"
                "        elif char == '(': \n"
                "            stack.append(char)\n"
                "        elif char == ')':\n"
                "            while stack and stack[-1] != '(': \n"
                "                output.append(stack.pop())\n"
                "            if stack: stack.pop()\n"
                "        else:\n"
                "            while stack and precedence(stack[-1]) >= precedence(char):\n"
                "                output.append(stack.pop())\n"
                "            stack.append(char)\n"
                "    while stack:\n"
                "        output.append(stack.pop())\n"
                "    return ''.join(output)\n\n"
                "def main():\n"
                "    print('=== Infix to Postfix Expression Converter (Advanced L2) ===')\n"
                "    infix = 'A+(B*C-(D/E^F)*G)*H'\n"
                "    postfix = infix_to_postfix(infix)\n"
                "    print('Infix Expression  :', infix)\n"
                "    print('Postfix Expression:', postfix)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Infix to Postfix Converter", ["Precedence Rules", "Operand Outputting", "Stack Precedence Pop", "Trailing Flush"], code
        else: # L3
            code = (
                "from abc import ABC, abstractmethod\n\n"
                "class Document:\n"
                "    def __init__(self):\n"
                "        self._content = []\n"
                "    def append(self, text: str):\n"
                "        self._content.append(text)\n"
                "    def delete_last(self, length: int):\n"
                "        current = ''.join(self._content)\n"
                "        self._content = [current[:max(0, len(current) - length)]]\n"
                "    def get_text(self) -> str:\n"
                "        return ''.join(self._content)\n\n"
                "class Command(ABC):\n"
                "    @abstractmethod\n"
                "    def execute(self) -> None: pass\n"
                "    @abstractmethod\n"
                "    def undo(self) -> None: pass\n\n"
                "class InsertCommand(Command):\n"
                "    def __init__(self, doc: Document, text: str):\n"
                "        self._doc = doc\n"
                "        self._text = text\n"
                "    def execute(self):\n"
                "        self._doc.append(self._text)\n"
                "    def undo(self):\n"
                "        self._doc.delete_last(len(self._text))\n\n"
                "def main():\n"
                "    print('=== Command Pattern Document Undo Architecture (Advanced L3) ===')\n"
                "    doc = Document()\n"
                "    history = []\n"
                "    cmd1 = InsertCommand(doc, 'Knowledge')\n"
                "    cmd1.execute()\n"
                "    history.append(cmd1)\n"
                "    cmd2 = InsertCommand(doc, ' Stream AI')\n"
                "    cmd2.execute()\n"
                "    history.append(cmd2)\n"
                "    print('Document content:', doc.get_text())\n"
                "    popped_cmd = history.pop()\n"
                "    popped_cmd.undo()\n"
                "    print('After 1st Undo  :', doc.get_text())\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Command Pattern Undo Architecture", ["Document Domain Model", "Command Interface", "Concrete Commands", "Stack History Dispatch"], code

# =========================================================================
# 2. QUEUE (9 GENUINELY DIFFERENT PYTHON PROGRAMS)
# =========================================================================

def get_python_queue(category: str, sub_lvl: str) -> Tuple[str, List[str], str]:
    if category == "beginner":
        if sub_lvl == "1":
            code = (
                "from collections import deque\n\n"
                "def main():\n"
                "    queue = deque()\n"
                "    print('=== Python FIFO Queue Basics (Beginner L1) ===')\n"
                "    queue.append('Task 1: Load Data')\n"
                "    queue.append('Task 2: Process Records')\n"
                "    queue.append('Task 3: Export CSV')\n"
                "    print('Initial queue:', list(queue))\n"
                "    serving = queue.popleft()\n"
                "    print('Serving task (FIFO):', serving)\n"
                "    print('Remaining in queue :', list(queue))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "FIFO Queue Basics", ["Deque Enqueue (append)", "FIFO Dequeue (popleft)", "Queue Inspection", "Order Verification"], code
        elif sub_lvl == "2":
            code = (
                "from collections import deque\n\n"
                "def main():\n"
                "    spooler = deque()\n"
                "    print('=== Print Spooler Queue Simulation (Beginner L2) ===')\n"
                "    spooler.append({'job_id': 101, 'document': 'Report.pdf', 'pages': 12})\n"
                "    spooler.append({'job_id': 102, 'document': 'Invoice.png', 'pages': 2})\n"
                "    spooler.append({'job_id': 103, 'document': 'Thesis.docx', 'pages': 85})\n"
                "    print('Total pending jobs:', len(spooler))\n"
                "    next_job = spooler[0]\n"
                "    print(f'Next job in line: {next_job[\"document\"]} ({next_job[\"pages\"]} pages)')\n"
                "    while spooler:\n"
                "        current = spooler.popleft()\n"
                "        print(f'Printing job #{current[\"job_id\"]}: {current[\"document\"]}')\n"
                "    print('Spooler is empty:', len(spooler) == 0)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Print Spooler Simulation", ["Structured Job Enqueue", "Front-of-Line Peek", "Sequential Processing", "Queue Exhaustion"], code
        else: # L3
            code = (
                "from collections import deque\n\n"
                "def round_robin_simulation(players: list, passes: int) -> str:\n"
                "    circle = deque(players)\n"
                "    print(f'Starting Round Robin with {len(players)} participants.')\n"
                "    round_num = 1\n"
                "    while len(circle) > 1:\n"
                "        for _ in range(passes):\n"
                "            circle.append(circle.popleft())\n"
                "        eliminated = circle.popleft()\n"
                "        print(f'Round {round_num}: {eliminated} eliminated')\n"
                "        round_num += 1\n"
                "    return circle.popleft()\n\n"
                "def main():\n"
                "    print('=== Round Robin Hot Potato Queue (Beginner L3) ===')\n"
                "    participants = ['Alice', 'Bob', 'Charlie', 'Diana', 'Evan']\n"
                "    winner = round_robin_simulation(participants, passes=3)\n"
                "    print('Winner is:', winner)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Round Robin Simulation", ["Circular Enqueue/Dequeue", "Rotation Mechanic", "Elimination via popleft", "Survivor Resolution"], code
    elif category == "intermediate":
        if sub_lvl == "1":
            code = (
                "class CircularQueue:\n"
                "    def __init__(self, capacity: int):\n"
                "        self.capacity = capacity\n"
                "        self.buffer = [None] * capacity\n"
                "        self.head = 0\n"
                "        self.tail = 0\n"
                "        self.count = 0\n\n"
                "    def enqueue(self, val) -> bool:\n"
                "        if self.count == self.capacity:\n"
                "            raise OverflowError('Queue is full')\n"
                "        self.buffer[self.tail] = val\n"
                "        self.tail = (self.tail + 1) % self.capacity\n"
                "        self.count += 1\n"
                "        return True\n\n"
                "    def dequeue(self):\n"
                "        if self.count == 0:\n"
                "            raise IndexError('Queue is empty')\n"
                "        val = self.buffer[self.head]\n"
                "        self.buffer[self.head] = None\n"
                "        self.head = (self.head + 1) % self.capacity\n"
                "        self.count -= 1\n"
                "        return val\n\n"
                "    def peek(self):\n"
                "        if self.count == 0: raise IndexError('Empty')\n"
                "        return self.buffer[self.head]\n\n"
                "def main():\n"
                "    print('=== Custom Circular Queue (Intermediate L1) ===')\n"
                "    cq = CircularQueue(4)\n"
                "    cq.enqueue('Req-A'); cq.enqueue('Req-B'); cq.enqueue('Req-C')\n"
                "    print('Dequeued:', cq.dequeue())\n"
                "    cq.enqueue('Req-D'); cq.enqueue('Req-E')\n"
                "    print('Current Head:', cq.peek())\n"
                "    print('Dequeued:', cq.dequeue())\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Circular Queue Implementation", ["Modulo Pointer Head/Tail", "Capacity Overflow Check", "Circular Dequeue Wrap", "Buffer State Recycling"], code
        elif sub_lvl == "2":
            code = (
                "class QueueUsingStacks:\n"
                "    def __init__(self):\n"
                "        self.in_stack = []\n"
                "        self.out_stack = []\n\n"
                "    def enqueue(self, item):\n"
                "        self.in_stack.append(item)\n\n"
                "    def dequeue(self):\n"
                "        if not self.out_stack:\n"
                "            while self.in_stack:\n"
                "                self.out_stack.append(self.in_stack.pop())\n"
                "        if not self.out_stack:\n"
                "            raise IndexError('Queue is empty')\n"
                "        return self.out_stack.pop()\n\n"
                "    def peek(self):\n"
                "        if not self.out_stack:\n"
                "            while self.in_stack:\n"
                "                self.out_stack.append(self.in_stack.pop())\n"
                "        return self.out_stack[-1]\n\n"
                "def main():\n"
                "    print('=== Queue via Two Stacks (Intermediate L2) ===')\n"
                "    q = QueueUsingStacks()\n"
                "    q.enqueue(10); q.enqueue(20); q.enqueue(30)\n"
                "    print('Dequeued:', q.dequeue())\n"
                "    q.enqueue(40)\n"
                "    print('Peek    :', q.peek())\n"
                "    print('Dequeued:', q.dequeue())\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Queue via Two Stacks", ["Dual Stack Model", "O(1) Amortized Enqueue", "Lazy Out-Stack Flush", "LIFO to FIFO Inversion"], code
        else: # L3
            code = (
                "import heapq\n\n"
                "class PriorityTaskScheduler:\n"
                "    def __init__(self):\n"
                "        self._heap = []\n"
                "        self._counter = 0\n\n"
                "    def add_task(self, task_name: str, priority: int):\n"
                "        heapq.heappush(self._heap, (priority, self._counter, task_name))\n"
                "        self._counter += 1\n\n"
                "    def pop_task(self) -> str:\n"
                "        if not self._heap:\n"
                "            raise IndexError('Scheduler empty')\n"
                "        prio, _, name = heapq.heappop(self._heap)\n"
                "        return f'[{prio}] {name}'\n\n"
                "def main():\n"
                "    print('=== Priority Queue Task Scheduler (Intermediate L3) ===')\n"
                "    scheduler = PriorityTaskScheduler()\n"
                "    scheduler.add_task('Backup Database', priority=3)\n"
                "    scheduler.add_task('Critical Bug Patch', priority=1)\n"
                "    scheduler.add_task('Send Weekly Newsletter', priority=5)\n"
                "    scheduler.add_task('Security Vulnerability Fix', priority=1)\n"
                "    print('Executing in priority order:')\n"
                "    while scheduler._heap:\n"
                "        print('  Running:', scheduler.pop_task())\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Priority Queue Task Scheduler", ["Binary Min-Heap Backing", "Tie-Breaking Sequence Counter", "Priority Dispatch", "O(log n) Heap Rebalance"], code
    else: # advanced
        if sub_lvl == "1":
            code = (
                "import queue\n"
                "import threading\n"
                "import time\n\n"
                "def worker(q: queue.Queue, worker_id: int):\n"
                "    while True:\n"
                "        item = q.get()\n"
                "        if item is None:\n"
                "            q.task_done()\n"
                "            break\n"
                "        print(f'Worker-{worker_id} processed: {item}')\n"
                "        time.sleep(0.01)\n"
                "        q.task_done()\n\n"
                "def main():\n"
                "    print('=== Thread-Safe Producer-Consumer Queue (Advanced L1) ===')\n"
                "    work_queue = queue.Queue(maxsize=10)\n"
                "    threads = []\n"
                "    for i in range(2):\n"
                "        t = threading.Thread(target=worker, args=(work_queue, i+1))\n"
                "        t.start()\n"
                "        threads.append(t)\n"
                "    for task in ['Task-A', 'Task-B', 'Task-C', 'Task-D']:\n"
                "        work_queue.put(task)\n"
                "    work_queue.join()\n"
                "    for _ in threads: work_queue.put(None)\n"
                "    for t in threads: t.join()\n"
                "    print('All jobs completed cleanly.')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Thread-Safe Queue", ["Bounded Sync Queue", "Worker Threads", "Producer Distribution", "Sentinel Shutdown Protocol"], code
        elif sub_lvl == "2":
            code = (
                "from collections import deque\n"
                "from typing import List\n\n"
                "def max_sliding_window(nums: List[int], k: int) -> List[int]:\n"
                "    dq = deque()\n"
                "    result = []\n"
                "    for i, n in enumerate(nums):\n"
                "        while dq and dq[0] < i - k + 1:\n"
                "            dq.popleft()\n"
                "        while dq and nums[dq[-1]] < n:\n"
                "            dq.pop()\n"
                "        dq.append(i)\n"
                "        if i >= k - 1:\n"
                "            result.append(nums[dq[0]])\n"
                "    return result\n\n"
                "def main():\n"
                "    print('=== Monotonic Deque Sliding Window Maximum (Advanced L2) ===')\n"
                "    arr = [1, 3, -1, -3, 5, 3, 6, 7]\n"
                "    window_size = 3\n"
                "    maxima = max_sliding_window(arr, window_size)\n"
                "    print('Input Array :', arr)\n"
                "    print(f'Window Size : {window_size}')\n"
                "    print('Max per Win :', maxima)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Monotonic Deque Window Maximum", ["Monotonic Index Queue", "Stale Index Pruning", "Strict Decreasing Order", "O(N) Amortized Pass"], code
        else: # L3
            code = (
                "import time\n"
                "from collections import deque\n\n"
                "class SlidingWindowRateLimiter:\n"
                "    def __init__(self, max_requests: int, window_seconds: float):\n"
                "        self.max_requests = max_requests\n"
                "        self.window_seconds = window_seconds\n"
                "        self.requests = deque()\n\n"
                "    def allow_request(self, current_time: float) -> bool:\n"
                "        while self.requests and self.requests[0] <= current_time - self.window_seconds:\n"
                "            self.requests.popleft()\n"
                "        if len(self.requests) < self.max_requests:\n"
                "            self.requests.append(current_time)\n"
                "            return True\n"
                "        return False\n\n"
                "def main():\n"
                "    print('=== Rate Limiter Queue with Timestamp Window (Advanced L3) ===')\n"
                "    limiter = SlidingWindowRateLimiter(max_requests=3, window_seconds=1.0)\n"
                "    timestamps = [0.1, 0.2, 0.5, 0.9, 1.2, 1.6]\n"
                "    for ts in timestamps:\n"
                "        allowed = limiter.allow_request(ts)\n"
                "        status = 'APPROVED' if allowed else 'RATE LIMITED (429)'\n"
                "        print(f'Request at t={ts:.1f}s -> {status}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Rate Limiter Queue", ["Sliding Window Timestamp Queue", "Expired Request Eviction", "Capacity Contract", "Deterministic Throttling"], code

# =========================================================================
# 3. LIST / ARRAY (9 GENUINELY DIFFERENT PYTHON PROGRAMS)
# =========================================================================

def get_python_list(category: str, sub_lvl: str) -> Tuple[str, List[str], str]:
    if category == "beginner":
        if sub_lvl == "1":
            code = (
                "def main():\n"
                "    fruits = ['Apple', 'Banana', 'Cherry', 'Date']\n"
                "    print('=== Python List Basic Operations (Beginner L1) ===')\n"
                "    print('Initial list :', fruits)\n"
                "    print('First element:', fruits[0])\n"
                "    print('Last element :', fruits[-1])\n"
                "    print('Slice [1:3]  :', fruits[1:3])\n"
                "    fruits.append('Elderberry')\n"
                "    fruits.insert(2, 'Blueberry')\n"
                "    print('After appends:', fruits)\n"
                "    removed = fruits.pop()\n"
                "    print('Popped element:', removed)\n"
                "    print('Final length  :', len(fruits))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "List Basic Operations", ["List Creation", "Zero-based & Negative Indexing", "Slicing Syntax", "Mutation & Length"], code
        elif sub_lvl == "2":
            code = (
                "def main():\n"
                "    scores = [78, 92, 64, 88, 99, 73, 85, 91]\n"
                "    print('=== List Aggregations and Filtering (Beginner L2) ===')\n"
                "    total = sum(scores)\n"
                "    count = len(scores)\n"
                "    avg = total / count\n"
                "    high = max(scores)\n"
                "    low = min(scores)\n"
                "    above_avg = []\n"
                "    for s in scores:\n"
                "        if s > avg:\n"
                "            above_avg.append(s)\n"
                "    print(f'Scores: {scores}')\n"
                "    print(f'Min: {low} | Max: {high} | Average: {avg:.2f}')\n"
                "    print(f'Scores above average ({len(above_avg)}): {above_avg}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "List Aggregations and Filtering", ["Numerical Reductions (sum, min, max)", "Average Calculation", "Conditional Filtering Loop", "Filtered Collection Gathering"], code
        else: # L3
            code = (
                "def main():\n"
                "    print('=== List Comprehensions & Transforms (Beginner L3) ===')\n"
                "    raw_numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]\n"
                "    squares_of_evens = [n ** 2 for n in raw_numbers if n % 2 == 0]\n"
                "    labels = [f'{n} is Even' if n % 2 == 0 else f'{n} is Odd' for n in raw_numbers[:5]]\n"
                "    words = ['python', 'dictator', 'algorithm', 'list']\n"
                "    capitalized = [w.capitalize() for w in words]\n"
                "    print('Input numbers    :', raw_numbers)\n"
                "    print('Evens squared    :', squares_of_evens)\n"
                "    print('Conditional tags :', labels)\n"
                "    print('Capitalized words:', capitalized)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "List Comprehensions & Transforms", ["Comprehension Syntax", "Conditional Filtering with if", "Ternary Transforms", "String Transformation"], code
    elif category == "intermediate":
        if sub_lvl == "1":
            code = (
                "def rotate_in_place(nums: list, k: int) -> None:\n"
                "    n = len(nums)\n"
                "    k = k % n\n"
                "    def reverse_slice(start: int, end: int):\n"
                "        while start < end:\n"
                "            nums[start], nums[end] = nums[end], nums[start]\n"
                "            start += 1\n"
                "            end -= 1\n"
                "    reverse_slice(0, n - 1)\n"
                "    reverse_slice(0, k - 1)\n"
                "    reverse_slice(k, n - 1)\n\n"
                "def main():\n"
                "    print('=== In-Place Array Rotation Two-Pointers (Intermediate L1) ===')\n"
                "    arr = [1, 2, 3, 4, 5, 6, 7]\n"
                "    k = 3\n"
                "    print('Original array:', arr)\n"
                "    rotate_in_place(arr, k)\n"
                "    print(f'Rotated by {k}   :', arr)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "In-Place Array Rotation", ["Two-Pointer Reversal Helper", "Full In-Place Inversion", "Prefix Reversal", "Suffix Reversal"], code
        elif sub_lvl == "2":
            code = (
                "def dutch_national_flag(nums: list) -> None:\n"
                "    low = 0\n"
                "    mid = 0\n"
                "    high = len(nums) - 1\n"
                "    while mid <= high:\n"
                "        if nums[mid] == 0:\n"
                "            nums[low], nums[mid] = nums[mid], nums[low]\n"
                "            low += 1\n"
                "            mid += 1\n"
                "        elif nums[mid] == 1:\n"
                "            mid += 1\n"
                "        else:\n"
                "            nums[mid], nums[high] = nums[high], nums[mid]\n"
                "            high -= 1\n\n"
                "def main():\n"
                "    print('=== Dutch National Flag 3-Way Partition (Intermediate L2) ===')\n"
                "    arr = [2, 0, 2, 1, 1, 0, 1, 2, 0]\n"
                "    print('Before sorting:', arr)\n"
                "    dutch_national_flag(arr)\n"
                "    print('After sorting :', arr)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Dutch National Flag Partition", ["Three-Pointer Invariant", "Zero Pivot Swap", "Two Pivot Swap", "O(N) In-Place Classification"], code
        else: # L3
            code = (
                "def subarray_sum(nums: list, target: int) -> tuple:\n"
                "    prefix_map = {0: -1}\n"
                "    curr_sum = 0\n"
                "    for idx, num in enumerate(nums):\n"
                "        curr_sum += num\n"
                "        needed = curr_sum - target\n"
                "        if needed in prefix_map:\n"
                "            start_idx = prefix_map[needed] + 1\n"
                "            return (start_idx, idx, nums[start_idx:idx+1])\n"
                "        prefix_map[curr_sum] = idx\n"
                "    return None\n\n"
                "def main():\n"
                "    print('=== Subarray Target Sum Prefix-Map (Intermediate L3) ===')\n"
                "    arr = [10, 2, -2, -20, 10]\n"
                "    target = -10\n"
                "    result = subarray_sum(arr, target)\n"
                "    if result:\n"
                "        start, end, sub = result\n"
                "        print(f'Found subarray summing to {target} from index {start} to {end}: {sub}')\n"
                "    else:\n"
                "        print(f'No subarray sums to {target}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Subarray Target Sum", ["Cumulative Prefix Sum", "Auxiliary Lookup Dictionary", "Target Difference Check", "Subarray Slice Extraction"], code
    else: # advanced
        if sub_lvl == "1":
            code = (
                "from typing import List, Tuple\n\n"
                "def max_subarray_kadane(nums: List[int]) -> Tuple[int, int, int]:\n"
                "    max_so_far = nums[0]\n"
                "    current_max = nums[0]\n"
                "    start = 0; end = 0; s = 0\n"
                "    for i in range(1, len(nums)):\n"
                "        if nums[i] > current_max + nums[i]:\n"
                "            current_max = nums[i]\n"
                "            s = i\n"
                "        else:\n"
                "            current_max += nums[i]\n"
                "        if current_max > max_so_far:\n"
                "            max_so_far = current_max\n"
                "            start = s\n"
                "            end = i\n"
                "    return max_so_far, start, end\n\n"
                "def main():\n"
                "    print('=== Kadane Maximum Subarray Algorithm (Advanced L1) ===')\n"
                "    arr = [-2, 1, -3, 4, -1, 2, 1, -5, 4]\n"
                "    max_sum, l, r = max_subarray_kadane(arr)\n"
                "    print('Input Array    :', arr)\n"
                "    print(f'Maximum Sum    : {max_sum}')\n"
                "    print(f'Subarray Range : indices [{l}..{r}] -> {arr[l:r+1]}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Kadane Algorithm", ["Local Maximum Optimization", "Global Maximum Tracking", "Subarray Bound Recording", "O(N) Single Pass"], code
        elif sub_lvl == "2":
            code = (
                "from typing import List\n\n"
                "def merge_intervals(intervals: List[List[int]]) -> List[List[int]]:\n"
                "    if not intervals: return []\n"
                "    intervals.sort(key=lambda x: x[0])\n"
                "    merged = [intervals[0]]\n"
                "    for current in intervals[1:]:\n"
                "        prev = merged[-1]\n"
                "        if current[0] <= prev[1]:\n"
                "            prev[1] = max(prev[1], current[1])\n"
                "        else:\n"
                "            merged.append(current)\n"
                "    return merged\n\n"
                "def main():\n"
                "    print('=== Merge Overlapping Intervals (Advanced L2) ===')\n"
                "    raw_intervals = [[1, 3], [2, 6], [8, 10], [15, 18], [9, 12]]\n"
                "    print('Input intervals :', raw_intervals)\n"
                "    result = merge_intervals(raw_intervals)\n"
                "    print('Merged intervals:', result)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Merge Overlapping Intervals", ["Interval Sorting by Start", "Overlap Boundary Condition", "In-Place Range Expansion", "Disjoint Interval Accumulation"], code
        else: # L3
            code = (
                "from typing import List\n\n"
                "def spiral_order(matrix: List[List[int]]) -> List[int]:\n"
                "    if not matrix or not matrix[0]: return []\n"
                "    res = []\n"
                "    top, bottom = 0, len(matrix) - 1\n"
                "    left, right = 0, len(matrix[0]) - 1\n"
                "    while top <= bottom and left <= right:\n"
                "        for c in range(left, right + 1): res.append(matrix[top][c])\n"
                "        top += 1\n"
                "        for r in range(top, bottom + 1): res.append(matrix[r][right])\n"
                "        right -= 1\n"
                "        if top <= bottom:\n"
                "            for c in range(right, left - 1, -1): res.append(matrix[bottom][c])\n"
                "            bottom -= 1\n"
                "        if left <= right:\n"
                "            for r in range(bottom, top - 1, -1): res.append(matrix[r][left])\n"
                "            left += 1\n"
                "    return res\n\n"
                "def main():\n"
                "    print('=== 2D Matrix Spiral Order Traversal (Advanced L3) ===')\n"
                "    grid = [\n"
                "        [ 1,  2,  3,  4],\n"
                "        [ 5,  6,  7,  8],\n"
                "        [ 9, 10, 11, 12]\n"
                "    ]\n"
                "    print('Grid:')\n"
                "    for row in grid: print(' ', row)\n"
                "    spiral = spiral_order(grid)\n"
                "    print('Spiral sequence:', spiral)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Matrix Spiral Traversal", ["Four Boundary Pointers", "Left-to-Right Scan", "Top-to-Bottom Scan", "Converging Spiral Perimeter"], code

# =========================================================================
# 4. LOOP (9 GENUINELY DIFFERENT PYTHON PROGRAMS)
# =========================================================================

def get_python_loop(category: str, sub_lvl: str) -> Tuple[str, List[str], str]:
    if category == "beginner":
        if sub_lvl == "1":
            code = (
                "def main():\n"
                "    print('=== For Loop with Range Parameters (Beginner L1) ===')\n"
                "    print('Forward count 1 to 5:')\n"
                "    for i in range(1, 6):\n"
                "        print(f'  Step: {i}')\n"
                "    print('Step increment by 3 (0 to 15):')\n"
                "    for n in range(0, 16, 3):\n"
                "        print(f'  Val: {n}')\n"
                "    print('Countdown 5 down to 1:')\n"
                "    for c in range(5, 0, -1):\n"
                "        print(f'  Blastoff in {c}...')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "For Loop with Range", ["Basic Range Loop", "Step Parameter Iteration", "Reverse Range Countdown", "Formatted Loop Output"], code
        elif sub_lvl == "2":
            code = (
                "def main():\n"
                "    print('=== While Loop Sentinel Termination (Beginner L2) ===')\n"
                "    energy = 100\n"
                "    cycle = 0\n"
                "    burn_rate = 15\n"
                "    print(f'Starting reactor simulation. Initial energy: {energy}%')\n"
                "    while energy > 0:\n"
                "        cycle += 1\n"
                "        consumed = min(energy, burn_rate)\n"
                "        energy -= consumed\n"
                "        print(f'Cycle #{cycle}: Consumed {consumed}%, Remaining: {energy}%')\n"
                "    print(f'Reactor reached safety threshold in {cycle} cycles.')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "While Loop Sentinel", ["Condition Initialization", "State Depletion Decrement", "Safe Termination Guard", "Cycle Iteration Counter"], code
        else: # L3
            code = (
                "def main():\n"
                "    print('=== Nested Loops Pattern Generator (Beginner L3) ===')\n"
                "    rows = 5\n"
                "    print('Right-angled number pyramid:')\n"
                "    for i in range(1, rows + 1):\n"
                "        row_str = ' '.join(str(j) for j in range(1, i + 1))\n"
                "        print(f'Row {i:2d}: {row_str}')\n"
                "    print(); print('Centered Pascal-like star tree:')\n"
                "    for i in range(1, rows + 1):\n"
                "        spaces = ' ' * (rows - i)\n"
                "        stars = '*' * (2 * i - 1)\n"
                "        print(f'{spaces}{stars}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Nested Loops Pattern", ["Outer Loop Row Control", "Inner Loop Column Assembly", "Space Indentation Calculation", "Symmetric Tree Render"], code
    elif category == "intermediate":
        if sub_lvl == "1":
            code = (
                "def main():\n"
                "    print('=== Loop Control Flow: Break, Continue, Else (Intermediate L1) ===')\n"
                "    records = [12, -4, 35, 0, 78, 999, 44]\n"
                "    processed = []\n"
                "    print('Processing stream with sentinel 999:')\n"
                "    for item in records:\n"
                "        if item < 0:\n"
                "            print(f'  Skipping negative entry: {item}')\n"
                "            continue\n"
                "        if item == 999:\n"
                "            print('  Encountered termination flag 999. Breaking!')\n"
                "            break\n"
                "        processed.append(item)\n"
                "    else:\n"
                "        print('  Loop completed without breaking.')\n"
                "    print('Clean processed batch:', processed)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Loop Control Flow", ["Continue Skip Logic", "Break Early Termination", "For-Else Completion Semantics", "Stream Filtration"], code
        elif sub_lvl == "2":
            code = (
                "def main():\n"
                "    print('=== Parallel Iteration with Enumerate and Zip (Intermediate L2) ===')\n"
                "    students = ['Alice', 'Bob', 'Charlie', 'Diana']\n"
                "    grades = [88, 95, 72, 91]\n"
                "    departments = ['CS', 'EE', 'ME', 'BIO']\n"
                "    print('Ranking students using enumerate(zip(...)):')\n"
                "    for rank, (name, score, dept) in enumerate(zip(students, grades, departments), start=1):\n"
                "        status = 'Honors' if score >= 90 else 'Standard'\n"
                "        print(f'#{rank} | {name:8} | Dept: {dept:4} | Score: {score} ({status})')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Enumerate and Zip Iteration", ["Zip Parallel Bundling", "Enumerate Rank Indexing", "Tuple Unpacking", "Formatted Tabular Iteration"], code
        else: # L3
            code = (
                "class FibonacciIterator:\n"
                "    def __init__(self, limit: int):\n"
                "        self.limit = limit\n"
                "        self.count = 0\n"
                "        self.a = 0\n"
                "        self.b = 1\n\n"
                "    def __iter__(self):\n"
                "        return self\n\n"
                "    def __next__(self) -> int:\n"
                "        if self.count >= self.limit:\n"
                "            raise StopIteration\n"
                "        val = self.a\n"
                "        self.a, self.b = self.b, self.a + self.b\n"
                "        self.count += 1\n"
                "        return val\n\n"
                "def main():\n"
                "    print('=== Custom Iterator Protocol (Intermediate L3) ===')\n"
                "    fib_gen = FibonacciIterator(limit=8)\n"
                "    print('Iterating through custom FibonacciIterator:')\n"
                "    for idx, num in enumerate(fib_gen, start=1):\n"
                "        print(f'Term {idx:2d} -> {num}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Custom Iterator Protocol", ["__iter__ Implementation", "__next__ Implementation", "StopIteration Signal", "State Preservation"], code
    else: # advanced
        if sub_lvl == "1":
            code = (
                "from typing import Generator\n\n"
                "def stream_batcher(source: list, batch_size: int) -> Generator[list, None, None]:\n"
                "    for i in range(0, len(source), batch_size):\n"
                "        yield source[i:i + batch_size]\n\n"
                "def prime_stream() -> Generator[int, None, None]:\n"
                "    def is_prime(n: int) -> bool:\n"
                "        if n < 2: return False\n"
                "        for d in range(2, int(n**0.5) + 1):\n"
                "            if n % d == 0: return False\n"
                "        return True\n"
                "    candidate = 2\n"
                "    while True:\n"
                "        if is_prime(candidate):\n"
                "            yield candidate\n"
                "        candidate += 1\n\n"
                "def main():\n"
                "    print('=== Generator Functions with Yield (Advanced L1) ===')\n"
                "    data = list(range(1, 23))\n"
                "    print('Batching 22 items into chunks of 5:')\n"
                "    for b_idx, batch in enumerate(stream_batcher(data, 5), start=1):\n"
                "        print(f'  Batch {b_idx}: {batch}')\n"
                "    print(); print('First 6 primes from infinite generator:')\n"
                "    p_gen = prime_stream()\n"
                "    primes = [next(p_gen) for _ in range(6)]\n"
                "    print('  Primes:', primes)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Generator Functions Yield", ["Chunked Yield Generator", "Infinite Prime Generator", "Lazy Evaluation Mechanics", "next() Stepping Protocol"], code
        elif sub_lvl == "2":
            code = (
                "import itertools\n\n"
                "def main():\n"
                "    print('=== Advanced Itertools Pipeline (Advanced L2) ===')\n"
                "    team_a = ['Alice', 'Bob']\n"
                "    team_b = ['Charlie', 'Diana']\n"
                "    combined = list(itertools.chain(team_a, team_b))\n"
                "    print('Chained sequences:', combined)\n"
                "    daily_sales = [100, 150, 80, 200, 300]\n"
                "    running_total = list(itertools.accumulate(daily_sales))\n"
                "    print('Cumulative Sales :', running_total)\n"
                "    raw_transactions = [\n"
                "        ('Dept-A', 50), ('Dept-A', 75), ('Dept-B', 120), ('Dept-B', 30)\n"
                "    ]\n"
                "    print('Grouped totals by Department:')\n"
                "    for key, group in itertools.groupby(raw_transactions, key=lambda x: x[0]):\n"
                "        sub_total = sum(item[1] for item in group)\n"
                "        print(f'  {key}: total = {sub_total}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Itertools Data Pipeline", ["itertools.chain Chaining", "itertools.accumulate Prefix", "itertools.groupby Aggregations", "Pipeline Composition"], code
        else: # L3
            code = (
                "from collections import deque\n\n"
                "def task_coroutine(name: str, steps: int):\n"
                "    for step in range(1, steps + 1):\n"
                "        print(f'[{name}] executing cycle {step}/{steps}')\n"
                "        yield\n"
                "    print(f'[{name}] finished successfully.')\n\n"
                "class CooperativeScheduler:\n"
                "    def __init__(self):\n"
                "        self.tasks = deque()\n"
                "    def add_task(self, coro):\n"
                "        self.tasks.append(coro)\n"
                "    def run_all(self):\n"
                "        while self.tasks:\n"
                "            coro = self.tasks.popleft()\n"
                "            try:\n"
                "                next(coro)\n"
                "                self.tasks.append(coro)\n"
                "            except StopIteration:\n"
                "                pass\n\n"
                "def main():\n"
                "    print('=== Cooperative Multitasking Event Loop (Advanced L3) ===')\n"
                "    scheduler = CooperativeScheduler()\n"
                "    scheduler.add_task(task_coroutine('Task-Alpha', 3))\n"
                "    scheduler.add_task(task_coroutine('Task-Beta', 2))\n"
                "    scheduler.add_task(task_coroutine('Task-Gamma', 4))\n"
                "    print('Starting event loop execution:')\n"
                "    scheduler.run_all()\n"
                "    print('Event loop finished all tasks.')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Cooperative Multitasking Loop", ["Coroutine Yield Context Switch", "Round Robin Task Queue", "StopIteration Lifecycle", "Event Loop Dispatch"], code

# =========================================================================
# 5. FUNCTION (9 GENUINELY DIFFERENT PYTHON PROGRAMS)
# =========================================================================

def get_python_function(category: str, sub_lvl: str) -> Tuple[str, List[str], str]:
    if category == "beginner":
        if sub_lvl == "1":
            code = (
                "def calculate_area(length: float, width: float) -> float:\n"
                "    \"\"\"Calculate and return the area of a rectangle.\"\"\"\n"
                "    return length * width\n\n"
                "def greet_user(name: str) -> str:\n"
                "    return f'Welcome to KnowledgeStream AI, {name}!'\n\n"
                "def main():\n"
                "    print('=== Function Basics and Return Values (Beginner L1) ===')\n"
                "    greeting = greet_user('Naveen')\n"
                "    print(greeting)\n"
                "    rect_area = calculate_area(8.5, 4.0)\n"
                "    print(f'Rectangle area (8.5 x 4.0): {rect_area} sq units')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Function Basics", ["def Statement", "Type Annotations", "Docstring Specification", "Value Returning"], code
        elif sub_lvl == "2":
            code = (
                "def format_profile(username: str, role: str = 'Student', active: bool = True) -> tuple:\n"
                "    status = 'ACTIVE' if active else 'INACTIVE'\n"
                "    badge = f'[{role.upper()}] {username} ({status})'\n"
                "    return badge, role, active\n\n"
                "def main():\n"
                "    print('=== Default Args and Tuple Unpacking (Beginner L2) ===')\n"
                "    p1, r1, _ = format_profile('Alice')\n"
                "    print('Default args   :', p1)\n"
                "    p2, r2, s2 = format_profile('Bob', role='Mentor', active=False)\n"
                "    print('Custom args    :', p2)\n"
                "    p3, _, _ = format_profile(role='Admin', username='Root')\n"
                "    print('Keyword named  :', p3)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Default Args & Unpacking", ["Default Argument Values", "Keyword Argument Calling", "Multiple Value Tuple Return", "Unpacking Target Assignment"], code
        else: # L3
            code = (
                "def log_event(event_name: str, *tags, **metadata):\n"
                "    print(f'[EVENT: {event_name.upper()}]')\n"
                "    if tags:\n"
                "        print('  Tags     :', ', '.join(tags))\n"
                "    if metadata:\n"
                "        print('  Metadata :')\n"
                "        for k, v in metadata.items():\n"
                "            print(f'    - {k}: {v}')\n\n"
                "def main():\n"
                "    print('=== Variable Length Arguments *args & **kwargs (Beginner L3) ===')\n"
                "    log_event('UserLogin', 'security', 'auth', ip='192.168.1.1', user_id=402, status='SUCCESS')\n"
                "    log_event('FileUpload', 'storage', file_size_kb=1024, extension='.py')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Variable Length Args", ["*args Tuple Parameter", "**kwargs Dictionary Parameter", "Dynamic Parameter Forwarding", "Metadata Formatting"], code
    elif category == "intermediate":
        if sub_lvl == "1":
            code = (
                "def apply_pipeline(numbers: list, transform_fn, filter_fn) -> list:\n"
                "    \"\"\"Higher-order function applying filter and transform.\"\"\"\n"
                "    return [transform_fn(n) for n in numbers if filter_fn(n)]\n\n"
                "def main():\n"
                "    print('=== First-Class & Higher-Order Functions (Intermediate L1) ===')\n"
                "    data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]\n"
                "    is_even = lambda x: x % 2 == 0\n"
                "    cube = lambda x: x ** 3\n"
                "    result = apply_pipeline(data, transform_fn=cube, filter_fn=is_even)\n"
                "    print('Input data   :', data)\n"
                "    print('Cubes of evens:', result)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Higher-Order Functions", ["Passing Functions as Arguments", "Lambda Expressions", "Functional Transformation", "Pipeline Composition"], code
        elif sub_lvl == "2":
            code = (
                "def make_rate_accumulator(initial_balance: float = 0.0):\n"
                "    balance = initial_balance\n"
                "    def deposit(amount: float) -> float:\n"
                "        nonlocal balance\n"
                "        balance += amount\n"
                "        return balance\n"
                "    def withdraw(amount: float) -> float:\n"
                "        nonlocal balance\n"
                "        if amount > balance:\n"
                "            raise ValueError('Insufficient funds')\n"
                "        balance -= amount\n"
                "        return balance\n"
                "    def get_balance() -> float:\n"
                "        return balance\n"
                "    return deposit, withdraw, get_balance\n\n"
                "def main():\n"
                "    print('=== Closures & Nonlocal Lexical Scope (Intermediate L2) ===')\n"
                "    deposit, withdraw, get_bal = make_rate_accumulator(100.0)\n"
                "    print('Opening balance:', get_bal())\n"
                "    deposit(50.0)\n"
                "    print('After deposit 50 :', get_bal())\n"
                "    withdraw(30.0)\n"
                "    print('After withdraw 30:', get_bal())\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Closures and Lexical Scope", ["Closure Outer Frame", "nonlocal Variable Mutation", "Encapsulated State Factory", "Multiple Function Returns"], code
        else: # L3
            code = (
                "import time\n"
                "import functools\n\n"
                "def execution_logger(func):\n"
                "    @functools.wraps(func)\n"
                "    def wrapper(*args, **kwargs):\n"
                "        t0 = time.perf_counter()\n"
                "        result = func(*args, **kwargs)\n"
                "        t1 = time.perf_counter()\n"
                "        elapsed_ms = (t1 - t0) * 1000\n"
                "        print(f'[BENCHMARK] {func.__name__} completed in {elapsed_ms:.4f} ms')\n"
                "        return result\n"
                "    return wrapper\n\n"
                "@execution_logger\n"
                "def simulate_computation(n: int) -> int:\n"
                "    total = 0\n"
                "    for i in range(n): total += i\n"
                "    return total\n\n"
                "def main():\n"
                "    print('=== Execution Benchmark Decorator (Intermediate L3) ===')\n"
                "    res = simulate_computation(50000)\n"
                "    print('Computation result:', res)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Benchmark Decorator", ["functools.wraps Metadata", "Wrapper Inner Function", "Timer Execution Hooks", "Decorator Syntax @"], code
    else: # advanced
        if sub_lvl == "1":
            code = (
                "import functools\n\n"
                "def retry(max_attempts: int = 3, default_fallback = None):\n"
                "    def decorator(func):\n"
                "        @functools.wraps(func)\n"
                "        def wrapper(*args, **kwargs):\n"
                "            last_err = None\n"
                "            for attempt in range(1, max_attempts + 1):\n"
                "                try:\n"
                "                    return func(*args, **kwargs)\n"
                "                except Exception as e:\n"
                "                    last_err = e\n"
                "                    print(f'  Attempt {attempt}/{max_attempts} failed: {e}')\n"
                "            if default_fallback is not None:\n"
                "                return default_fallback\n"
                "            raise last_err\n"
                "        return wrapper\n"
                "    return decorator\n\n"
                "attempts_count = 0\n"
                "@retry(max_attempts=3, default_fallback='FALLBACK_RESPONSE')\n"
                "def unreliable_network_call():\n"
                "    global attempts_count\n"
                "    attempts_count += 1\n"
                "    if attempts_count < 3:\n"
                "        raise ConnectionResetError('Network timeout')\n"
                "    return 'SUCCESSFUL_PAYLOAD'\n\n"
                "def main():\n"
                "    print('=== Parametric Decorator with Arguments (Advanced L1) ===')\n"
                "    res = unreliable_network_call()\n"
                "    print('Final Output:', res)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Parametric Retry Decorator", ["3-Level Decorator Factory", "Exception Catching & Retries", "Fallback Return Protocol", "Wrapper Transparency"], code
        elif sub_lvl == "2":
            code = (
                "from functools import partial\n\n"
                "def power(base: float, exponent: float) -> float:\n"
                "    return base ** exponent\n\n"
                "def compose(*functions):\n"
                "    def apply(arg):\n"
                "        result = arg\n"
                "        for f in functions:\n"
                "            result = f(result)\n"
                "        return result\n"
                "    return apply\n\n"
                "def main():\n"
                "    print('=== Partial Application and Function Currying (Advanced L2) ===')\n"
                "    square = partial(power, exponent=2)\n"
                "    cube = partial(power, exponent=3)\n"
                "    add_ten = lambda x: x + 10\n"
                "    double = lambda x: x * 2\n"
                "    pipeline = compose(square, double, add_ten)\n"
                "    print('square(5):', square(5))\n"
                "    print('cube(3)  :', cube(3))\n"
                "    print('pipeline(4) -> (4^2)*2 + 10 =', pipeline(4))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Currying & Pipelines", ["functools.partial Binding", "Function Composition Engine", "Modular Pipeline Construction", "Reusable Micro-Functions"], code
        else: # L3
            code = (
                "class EventRegistry:\n"
                "    def __init__(self):\n"
                "        self._handlers = {}\n"
                "    def register(self, event_type: str):\n"
                "        def decorator(handler_fn):\n"
                "            self._handlers.setdefault(event_type, []).append(handler_fn)\n"
                "            return handler_fn\n"
                "        return decorator\n"
                "    def dispatch(self, event_type: str, *args, **kwargs):\n"
                "        if event_type not in self._handlers:\n"
                "            print(f'No handlers registered for {event_type}')\n"
                "            return\n"
                "        for fn in self._handlers[event_type]:\n"
                "            fn(*args, **kwargs)\n\n"
                "registry = EventRegistry()\n"
                "@registry.register('USER_SIGNUP')\n"
                "def send_welcome_email(user_email: str):\n"
                "    print(f'[EMAIL SERVICE] Welcome email dispatched to {user_email}')\n"
                "@registry.register('USER_SIGNUP')\n"
                "def audit_signup(user_email: str):\n"
                "    print(f'[AUDIT SERVICE] Recorded signup audit log for {user_email}')\n\n"
                "def main():\n"
                "    print('=== Decorator Plugin Registry Dispatcher (Advanced L3) ===')\n"
                "    registry.dispatch('USER_SIGNUP', 'alex@example.com')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Plugin Dispatch Registry", ["Decorator Registry Pattern", "Dynamic Event Dispatcher", "Decoupled Event Subscribers", "Multi-Observer Routing"], code

# =========================================================================
# 6. OOP / CLASSES (9 GENUINELY DIFFERENT PYTHON PROGRAMS)
# =========================================================================

def get_python_oop(category: str, sub_lvl: str) -> Tuple[str, List[str], str]:
    if category == "beginner":
        if sub_lvl == "1":
            code = (
                "class Student:\n"
                "    def __init__(self, name: str, roll_number: int, course: str):\n"
                "        self.name = name\n"
                "        self.roll_number = roll_number\n"
                "        self.course = course\n"
                "        self.enrolled_topics = []\n\n"
                "    def enroll(self, topic: str):\n"
                "        self.enrolled_topics.append(topic)\n"
                "        print(f'{self.name} enrolled in {topic}')\n\n"
                "    def get_summary(self) -> str:\n"
                "        return f'Student: {self.name} (#{self.roll_number}) | Course: {self.course} | Topics: {len(self.enrolled_topics)}'\n\n"
                "def main():\n"
                "    print('=== Basic OOP Class and Methods (Beginner L1) ===')\n"
                "    s = Student('Ananya', 104, 'Computer Science')\n"
                "    s.enroll('Python Data Structures')\n"
                "    s.enroll('AI Algorithms')\n"
                "    print(s.get_summary())\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Basic OOP Class", ["class Keyword", "__init__ Constructor", "Instance Attributes self", "Method Invocation"], code
        elif sub_lvl == "2":
            code = (
                "class BankAccount:\n"
                "    def __init__(self, owner: str, initial_balance: float = 0.0):\n"
                "        self.owner = owner\n"
                "        self.__balance = max(0.0, initial_balance)\n\n"
                "    @property\n"
                "    def balance(self) -> float:\n"
                "        return self.__balance\n\n"
                "    def deposit(self, amount: float):\n"
                "        if amount <= 0:\n"
                "            raise ValueError('Deposit amount must be positive')\n"
                "        self.__balance += amount\n"
                "        print(f'Deposited ${amount:.2f} | New balance: ${self.__balance:.2f}')\n\n"
                "    def withdraw(self, amount: float):\n"
                "        if amount <= 0:\n"
                "            raise ValueError('Withdrawal must be positive')\n"
                "        if amount > self.__balance:\n"
                "            raise ValueError('Insufficient funds')\n"
                "        self.__balance -= amount\n"
                "        print(f'Withdrew ${amount:.2f} | New balance: ${self.__balance:.2f}')\n\n"
                "def main():\n"
                "    print('=== Encapsulation with Private Attributes and Property (Beginner L2) ===')\n"
                "    acc = BankAccount('Priya', 250.0)\n"
                "    acc.deposit(100.0)\n"
                "    acc.withdraw(50.0)\n"
                "    print(f'Audited account balance via property: ${acc.balance:.2f}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Encapsulation & Properties", ["Private Name Mangling (__)", "@property Getter Decorator", "Defensive Invariant Checks", "Mutator Methods"], code
        else: # L3
            code = (
                "class Vehicle:\n"
                "    def __init__(self, brand: str, model: str):\n"
                "        self.brand = brand\n"
                "        self.model = model\n"
                "    def description(self) -> str:\n"
                "        return f'{self.brand} {self.model}'\n"
                "    def start_engine(self) -> str:\n"
                "        return 'Combustion engine rumbling.'\n\n"
                "class ElectricCar(Vehicle):\n"
                "    def __init__(self, brand: str, model: str, battery_kwh: int):\n"
                "        super().__init__(brand, model)\n"
                "        self.battery_kwh = battery_kwh\n"
                "    def start_engine(self) -> str:\n"
                "        return f'Silent electric motor activated. {self.battery_kwh}kWh ready.'\n\n"
                "def main():\n"
                "    print('=== Single Inheritance and Method Overriding (Beginner L3) ===')\n"
                "    car = ElectricCar('Tesla', 'Model 3', battery_kwh=75)\n"
                "    print('Vehicle:', car.description())\n"
                "    print('Action :', car.start_engine())\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Inheritance & Overriding", ["Subclassing (BaseClass)", "super().__init__ Delegation", "Polymorphic Method Overriding", "Specialized Attributes"], code
    elif category == "intermediate":
        if sub_lvl == "1":
            code = (
                "class JsonSerializableMixin:\n"
                "    def to_json_dict(self):\n"
                "        return {k: v for k, v in self.__dict__.items() if not k.startswith('_')}\n\n"
                "class TimestampMixin:\n"
                "    def __init__(self, *args, **kwargs):\n"
                "        super().__init__(*args, **kwargs)\n"
                "        import time\n"
                "        self.created_at = time.time()\n\n"
                "class UserProfile(TimestampMixin, JsonSerializableMixin):\n"
                "    def __init__(self, username: str, email: str):\n"
                "        super().__init__()\n"
                "        self.username = username\n"
                "        self.email = email\n\n"
                "def main():\n"
                "    print('=== Multiple Inheritance and Mixins (Intermediate L1) ===')\n"
                "    profile = UserProfile('Kavitha', 'kavitha@example.com')\n"
                "    print('MRO (Method Resolution Order):', [c.__name__ for c in UserProfile.__mro__])\n"
                "    print('Exported JSON Dict:', profile.to_json_dict())\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Multiple Inheritance & Mixins", ["Mixin Behavioral Decomposition", "Cooperative super() Calls", "Method Resolution Order (MRO)", "Dynamic Serialization"], code
        elif sub_lvl == "2":
            code = (
                "from abc import ABC, abstractmethod\n"
                "import math\n\n"
                "class Shape(ABC):\n"
                "    @abstractmethod\n"
                "    def area(self) -> float: pass\n"
                "    @abstractmethod\n"
                "    def perimeter(self) -> float: pass\n\n"
                "class Circle(Shape):\n"
                "    def __init__(self, radius: float): self.radius = radius\n"
                "    def area(self) -> float: return math.pi * (self.radius ** 2)\n"
                "    def perimeter(self) -> float: return 2 * math.pi * self.radius\n\n"
                "class Rectangle(Shape):\n"
                "    def __init__(self, w: float, h: float): self.w = w; self.h = h\n"
                "    def area(self) -> float: return self.w * self.h\n"
                "    def perimeter(self) -> float: return 2 * (self.w + self.h)\n\n"
                "def main():\n"
                "    print('=== Abstract Base Classes & Polymorphism (Intermediate L2) ===')\n"
                "    shapes = [Circle(5.0), Rectangle(4.0, 6.0)]\n"
                "    for s in shapes:\n"
                "        print(f'{s.__class__.__name__:10} | Area: {s.area():.2f} | Perimeter: {s.perimeter():.2f}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Abstract Base Classes", ["abc.ABC Abstract Base", "@abstractmethod Contracts", "Polymorphic Duck Typing", "Interface Enforcement"], code
        else: # L3
            code = (
                "class Vector2D:\n"
                "    def __init__(self, x: float, y: float):\n"
                "        self.x = x\n"
                "        self.y = y\n"
                "    def __repr__(self) -> str:\n"
                "        return f'Vector2D({self.x}, {self.y})'\n"
                "    def __str__(self) -> str:\n"
                "        return f'({self.x}, {self.y})'\n"
                "    def __add__(self, other: 'Vector2D') -> 'Vector2D':\n"
                "        return Vector2D(self.x + other.x, self.y + other.y)\n"
                "    def __sub__(self, other: 'Vector2D') -> 'Vector2D':\n"
                "        return Vector2D(self.x - other.x, self.y - other.y)\n"
                "    def __eq__(self, other) -> bool:\n"
                "        if not isinstance(other, Vector2D): return False\n"
                "        return self.x == other.x and self.y == other.y\n"
                "    def __abs__(self) -> float:\n"
                "        return (self.x**2 + self.y**2) ** 0.5\n\n"
                "def main():\n"
                "    print('=== Dunder / Magic Methods Operator Overloading (Intermediate L3) ===')\n"
                "    v1 = Vector2D(3, 4)\n"
                "    v2 = Vector2D(1, 2)\n"
                "    print('v1        :', v1)\n"
                "    print('v2        :', v2)\n"
                "    print('v1 + v2   :', v1 + v2)\n"
                "    print('|v1| (mag):', abs(v1))\n"
                "    print('v1 == v2  :', v1 == v2)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Dunder Magic Methods", ["__str__ & __repr__ Output", "__add__ Operator Overloading", "__eq__ Value Equality", "__abs__ Mathematical Norm"], code
    else: # advanced
        if sub_lvl == "1":
            code = (
                "class DatabaseSession:\n"
                "    def __init__(self, connection_str: str):\n"
                "        self.connection_str = connection_str\n"
                "        self.is_connected = False\n"
                "    def __enter__(self):\n"
                "        print(f'[SESSION] Opening connection to {self.connection_str}')\n"
                "        self.is_connected = True\n"
                "        return self\n"
                "    def __exit__(self, exc_type, exc_val, exc_tb):\n"
                "        print(f'[SESSION] Closing connection (Exception: {exc_type})')\n"
                "        self.is_connected = False\n"
                "        return False\n"
                "    def query(self, sql: str):\n"
                "        if not self.is_connected: raise RuntimeError('Not connected')\n"
                "        print(f'  Executing SQL: {sql}')\n\n"
                "def main():\n"
                "    print('=== Custom Context Manager Protocol (Advanced L1) ===')\n"
                "    with DatabaseSession('sqlite3://app.db') as session:\n"
                "        session.query('SELECT * FROM users')\n"
                "    print('Session active after with block?', session.is_connected)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Context Manager Protocol", ["__enter__ Resource Allocation", "__exit__ Resource Teardown", "Exception Propagation Handling", "with Statement Binding"], code
        elif sub_lvl == "2":
            code = (
                "from abc import ABC, abstractmethod\n\n"
                "class Notification(ABC):\n"
                "    @abstractmethod\n"
                "    def send(self, recipient: str, msg: str): pass\n\n"
                "class EmailNotification(Notification):\n"
                "    def send(self, recipient: str, msg: str):\n"
                "        print(f'[EMAIL] Sending \"{msg}\" to {recipient}')\n\n"
                "class SMSNotification(Notification):\n"
                "    def send(self, recipient: str, msg: str):\n"
                "        print(f'[SMS] Sending \"{msg}\" to mobile {recipient}')\n\n"
                "class NotificationFactory:\n"
                "    _channels = {'email': EmailNotification, 'sms': SMSNotification}\n"
                "    @classmethod\n"
                "    def create(cls, channel: str) -> Notification:\n"
                "        subclass = cls._channels.get(channel.lower())\n"
                "        if not subclass: raise ValueError(f'Unknown channel: {channel}')\n"
                "        return subclass()\n\n"
                "def main():\n"
                "    print('=== Factory Design Pattern (Advanced L2) ===')\n"
                "    notifier1 = NotificationFactory.create('email')\n"
                "    notifier1.send('user@domain.com', 'Your report is ready')\n"
                "    notifier2 = NotificationFactory.create('sms')\n"
                "    notifier2.send('+1234567890', 'Security Code: 9812')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Factory Design Pattern", ["Abstract Factory Interface", "Concrete Product Classes", "Dynamic Factory Lookup", "Decoupled Instantiation"], code
        else: # L3
            code = (
                "from abc import ABC, abstractmethod\n\n"
                "class Observer(ABC):\n"
                "    @abstractmethod\n"
                "    def update(self, temperature: float, humidity: float): pass\n\n"
                "class WeatherStation:\n"
                "    def __init__(self):\n"
                "        self._observers = []\n"
                "    def register(self, obs: Observer):\n"
                "        self._observers.append(obs)\n"
                "    def notify(self, temp: float, humidity: float):\n"
                "        for obs in self._observers:\n"
                "            obs.update(temp, humidity)\n\n"
                "class PhoneDisplay(Observer):\n"
                "    def update(self, temp: float, humidity: float):\n"
                "        print(f'[PhoneDisplay] Temp: {temp}C, Humidity: {humidity}%')\n\n"
                "class AlertSystem(Observer):\n"
                "    def update(self, temp: float, humidity: float):\n"
                "        if temp > 35.0:\n"
                "            print(f'[HEAT ALERT] Dangerous temperature detected: {temp}C!')\n\n"
                "def main():\n"
                "    print('=== Observer Design Pattern Architecture (Advanced L3) ===')\n"
                "    station = WeatherStation()\n"
                "    station.register(PhoneDisplay())\n"
                "    station.register(AlertSystem())\n"
                "    station.notify(24.5, 60.0)\n"
                "    station.notify(38.0, 75.0)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Observer Design Pattern", ["Subject State Management", "Observer Interface Contract", "Broadcast Notification Dispatch", "Loose Coupling Decoupling"], code

# =========================================================================
# 7. LINKED LIST (9 GENUINELY DIFFERENT PYTHON PROGRAMS)
# =========================================================================

def get_python_linked_list(category: str, sub_lvl: str) -> Tuple[str, List[str], str]:
    if category == "beginner":
        if sub_lvl == "1":
            code = (
                "class Node:\n"
                "    def __init__(self, val: int):\n"
                "        self.val = val\n"
                "        self.next = None\n\n"
                "class SinglyLinkedList:\n"
                "    def __init__(self):\n"
                "        self.head = None\n"
                "    def append(self, val: int):\n"
                "        new_node = Node(val)\n"
                "        if not self.head:\n"
                "            self.head = new_node\n"
                "            return\n"
                "        curr = self.head\n"
                "        while curr.next: curr = curr.next\n"
                "        curr.next = new_node\n"
                "    def to_list(self) -> list:\n"
                "        res = []; curr = self.head\n"
                "        while curr: res.append(curr.val); curr = curr.next\n"
                "        return res\n\n"
                "def main():\n"
                "    print('=== Singly Linked List Node and Insertion (Beginner L1) ===')\n"
                "    ll = SinglyLinkedList()\n"
                "    ll.append(10); ll.append(20); ll.append(30)\n"
                "    print('Linked List:', ll.to_list())\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Singly Linked List Init", ["Node Definition", "Head Pointer Tracking", "Tail Traversal Append", "Linear Array Conversion"], code
        elif sub_lvl == "2":
            code = (
                "class Node:\n"
                "    def __init__(self, val: int, next_node=None):\n"
                "        self.val = val\n"
                "        self.next = next_node\n\n"
                "def search_and_count(head: Node, target: int) -> tuple:\n"
                "    count = 0; found_index = -1; curr = head; idx = 0\n"
                "    while curr:\n"
                "        count += 1\n"
                "        if curr.val == target and found_index == -1:\n"
                "            found_index = idx\n"
                "        curr = curr.next\n"
                "        idx += 1\n"
                "    return count, found_index\n\n"
                "def main():\n"
                "    print('=== Linked List Traversal, Search & Length (Beginner L2) ===')\n"
                "    head = Node(5, Node(15, Node(25, Node(35))))\n"
                "    length, pos = search_and_count(head, 25)\n"
                "    print(f'Total length: {length}')\n"
                "    print(f'Search 25   : found at index {pos}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Traversal and Search", ["Linear Node Traversal", "Node Length Counter", "Value Search Condition", "Position Index Tracking"], code
        else: # L3
            code = (
                "class Node:\n"
                "    def __init__(self, val: int, next_node=None): self.val = val; self.next = next_node\n\n"
                "def delete_by_value(head: Node, val: int) -> Node:\n"
                "    if not head: return None\n"
                "    if head.val == val: return head.next\n"
                "    curr = head\n"
                "    while curr.next and curr.next.val != val:\n"
                "        curr = curr.next\n"
                "    if curr.next:\n"
                "        curr.next = curr.next.next\n"
                "    return head\n\n"
                "def print_ll(head: Node):\n"
                "    nodes = []\n"
                "    while head: nodes.append(str(head.val)); head = head.next\n"
                "    print(' -> '.join(nodes))\n\n"
                "def main():\n"
                "    print('=== Deletion of Node by Value (Beginner L3) ===')\n"
                "    head = Node(10, Node(20, Node(30, Node(40))))\n"
                "    print('Before deletion: ', end=''); print_ll(head)\n"
                "    head = delete_by_value(head, 20)\n"
                "    print('After delete 20: ', end=''); print_ll(head)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Node Deletion by Value", ["Head Deletion Edge Case", "Previous Pointer Traversal", "Link Bypass Pointer Rewire", "List Formatted Display"], code
    elif category == "intermediate":
        if sub_lvl == "1":
            code = (
                "class Node:\n"
                "    def __init__(self, val: int, next_node=None): self.val = val; self.next = next_node\n\n"
                "def reverse_list(head: Node) -> Node:\n"
                "    prev = None\n"
                "    curr = head\n"
                "    while curr:\n"
                "        next_temp = curr.next\n"
                "        curr.next = prev\n"
                "        prev = curr\n"
                "        curr = next_temp\n"
                "    return prev\n\n"
                "def main():\n"
                "    print('=== In-Place Singly Linked List Reversal (Intermediate L1) ===')\n"
                "    head = Node(1, Node(2, Node(3, Node(4, Node(5)))))\n"
                "    rev = reverse_list(head)\n"
                "    res = []\n"
                "    while rev: res.append(str(rev.val)); rev = rev.next\n"
                "    print('Reversed: ' + ' -> '.join(res))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "In-Place List Reversal", ["Three-Pointer Invariant (prev, curr, next)", "Pointer Direction Reversal", "O(1) Space Inversion", "New Head Resolution"], code
        elif sub_lvl == "2":
            code = (
                "class Node:\n"
                "    def __init__(self, val: int, next_node=None): self.val = val; self.next = next_node\n\n"
                "def find_middle_node(head: Node) -> int:\n"
                "    slow = head\n"
                "    fast = head\n"
                "    while fast and fast.next:\n"
                "        slow = slow.next\n"
                "        fast = fast.next.next\n"
                "    return slow.val if slow else None\n\n"
                "def main():\n"
                "    print('=== Fast and Slow Pointers Middle Element (Intermediate L2) ===')\n"
                "    odd_list = Node(10, Node(20, Node(30, Node(40, Node(50)))))\n"
                "    mid = find_middle_node(odd_list)\n"
                "    print('Middle of [10, 20, 30, 40, 50]:', mid)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Fast & Slow Middle Pointer", ["Floyd Tortoise and Hare", "Dual Velocity Pointers", "O(N) Single-Pass Discovery", "Null Boundary Validation"], code
        else: # L3
            code = (
                "class DNode:\n"
                "    def __init__(self, val: int):\n"
                "        self.val = val\n"
                "        self.prev = None\n"
                "        self.next = None\n\n"
                "class DoublyLinkedList:\n"
                "    def __init__(self):\n"
                "        self.head = None\n"
                "        self.tail = None\n"
                "    def append(self, val: int):\n"
                "        new_node = DNode(val)\n"
                "        if not self.head:\n"
                "            self.head = self.tail = new_node\n"
                "            return\n"
                "        self.tail.next = new_node\n"
                "        new_node.prev = self.tail\n"
                "        self.tail = new_node\n\n"
                "def main():\n"
                "    print('=== Doubly Linked List Bidirectional Traversal (Intermediate L3) ===')\n"
                "    dll = DoublyLinkedList()\n"
                "    for v in [100, 200, 300]: dll.append(v)\n"
                "    forward = []; curr = dll.head\n"
                "    while curr: forward.append(str(curr.val)); curr = curr.next\n"
                "    backward = []; curr = dll.tail\n"
                "    while curr: backward.append(str(curr.val)); curr = curr.prev\n"
                "    print('Forward  :', ' <-> '.join(forward))\n"
                "    print('Backward :', ' <-> '.join(backward))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Doubly Linked List", ["Bidirectional DNode", "Head and Tail Tracking", "Forward Traversal", "Backward Traversal"], code
    else: # advanced
        if sub_lvl == "1":
            code = (
                "class Node:\n"
                "    def __init__(self, val: int, next_node=None): self.val = val; self.next = next_node\n\n"
                "def detect_cycle(head: Node) -> bool:\n"
                "    slow = head\n"
                "    fast = head\n"
                "    while fast and fast.next:\n"
                "        slow = slow.next\n"
                "        fast = fast.next.next\n"
                "        if slow == fast:\n"
                "            return True\n"
                "    return False\n\n"
                "def main():\n"
                "    print('=== Floyd Cycle Detection Algorithm (Advanced L1) ===')\n"
                "    n1 = Node(1); n2 = Node(2); n3 = Node(3); n4 = Node(4)\n"
                "    n1.next = n2; n2.next = n3; n3.next = n4; n4.next = n2  # Cycle\n"
                "    print('Has cycle:', detect_cycle(n1))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Cycle Detection Algorithm", ["Floyd Cycle-Finding Proof", "Fast/Slow Convergence Check", "Cycle Detection Invariant", "Constant Space O(1)"], code
        elif sub_lvl == "2":
            code = (
                "class Node:\n"
                "    def __init__(self, val: int, next_node=None): self.val = val; self.next = next_node\n\n"
                "def merge_two_sorted(l1: Node, l2: Node) -> Node:\n"
                "    dummy = Node(-1)\n"
                "    tail = dummy\n"
                "    while l1 and l2:\n"
                "        if l1.val <= l2.val:\n"
                "            tail.next = l1\n"
                "            l1 = l1.next\n"
                "        else:\n"
                "            tail.next = l2\n"
                "            l2 = l2.next\n"
                "        tail = tail.next\n"
                "    tail.next = l1 if l1 else l2\n"
                "    return dummy.next\n\n"
                "def main():\n"
                "    print('=== Merge Two Sorted Linked Lists (Advanced L2) ===')\n"
                "    a = Node(1, Node(3, Node(5)))\n"
                "    b = Node(2, Node(4, Node(6)))\n"
                "    merged = merge_two_sorted(a, b)\n"
                "    res = []\n"
                "    while merged: res.append(str(merged.val)); merged = merged.next\n"
                "    print('Merged list:', ' -> '.join(res))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Merge Sorted Lists", ["Dummy Head Sentinel Node", "Linear Comparison Convergence", "Remaining Tail Splicing", "Sorted Preservation"], code
        else: # L3
            code = (
                "class LRUNode:\n"
                "    def __init__(self, key: int, val: int):\n"
                "        self.key = key; self.val = val\n"
                "        self.prev = None; self.next = None\n\n"
                "class LRUCache:\n"
                "    def __init__(self, capacity: int):\n"
                "        self.cap = capacity\n"
                "        self.map = {}\n"
                "        self.head = LRUNode(0, 0); self.tail = LRUNode(0, 0)\n"
                "        self.head.next = self.tail; self.tail.prev = self.head\n"
                "    def _remove(self, node):\n"
                "        node.prev.next = node.next; node.next.prev = node.prev\n"
                "    def _add(self, node):\n"
                "        node.next = self.head.next; node.prev = self.head\n"
                "        self.head.next.prev = node; self.head.next = node\n"
                "    def get(self, key: int) -> int:\n"
                "        if key in self.map:\n"
                "            n = self.map[key]\n"
                "            self._remove(n); self._add(n)\n"
                "            return n.val\n"
                "        return -1\n"
                "    def put(self, key: int, val: int):\n"
                "        if key in self.map: self._remove(self.map[key])\n"
                "        n = LRUNode(key, val)\n"
                "        self._add(n); self.map[key] = n\n"
                "        if len(self.map) > self.cap:\n"
                "            lru = self.tail.prev\n"
                "            self._remove(lru); del self.map[lru.key]\n\n"
                "def main():\n"
                "    print('=== LRU Cache Doubly Linked List + HashMap (Advanced L3) ===')\n"
                "    cache = LRUCache(2)\n"
                "    cache.put(1, 10); cache.put(2, 20)\n"
                "    print('get(1):', cache.get(1))\n"
                "    cache.put(3, 30)  # evicts key 2\n"
                "    print('get(2) (evicted):', cache.get(2))\n"
                "    print('get(3):', cache.get(3))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "LRU Cache Architecture", ["Doubly Linked List Node", "Hash Map Lookup O(1)", "Head/Tail Dummy Anchors", "Eviction of Least Recently Used"], code

# =========================================================================
# 8. DICTIONARY (9 GENUINELY DIFFERENT PYTHON PROGRAMS)
# =========================================================================

def get_python_dictionary(category: str, sub_lvl: str) -> Tuple[str, List[str], str]:
    if category == "beginner":
        if sub_lvl == "1":
            code = (
                "def main():\n"
                "    user_profile = {'id': 101, 'name': 'Aditi', 'role': 'Developer'}\n"
                "    print('=== Dictionary Key-Value Operations (Beginner L1) ===')\n"
                "    print('Name:', user_profile['name'])\n"
                "    user_profile['city'] = 'Bengaluru'\n"
                "    salary = user_profile.get('salary', 'Undisclosed')\n"
                "    print('Salary (with fallback):', salary)\n"
                "    del user_profile['id']\n"
                "    print('Final dict:', user_profile)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Dictionary Operations", ["Dict Creation", "Key Lookup", "Safe .get() Access", "Key Deletion"], code
        elif sub_lvl == "2":
            code = (
                "def main():\n"
                "    inventory = {'Apples': 50, 'Bananas': 120, 'Cherries': 80, 'Dates': 30}\n"
                "    print('=== Dictionary Iteration and Views (Beginner L2) ===')\n"
                "    print('Keys  :', list(inventory.keys()))\n"
                "    print('Values:', list(inventory.values()))\n"
                "    print('Items :')\n"
                "    for product, qty in inventory.items():\n"
                "        status = 'In Stock' if qty >= 50 else 'Low Stock'\n"
                "        print(f'  - {product:10}: {qty:3d} units ({status})')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Dictionary Iteration", [".keys() & .values()", ".items() Unpacking Loop", "Stock Status Conditional", "Formatted Output"], code
        else: # L3
            code = (
                "def count_word_frequencies(text: str) -> dict:\n"
                "    freq = {}\n"
                "    clean_text = ''.join(c.lower() if c.isalnum() or c.isspace() else ' ' for c in text)\n"
                "    for word in clean_text.split():\n"
                "        freq[word] = freq.get(word, 0) + 1\n"
                "    return freq\n\n"
                "def main():\n"
                "    print('=== Word Frequency Counter (Beginner L3) ===')\n"
                "    passage = 'Python is fast, Python is clean, Python is powerful.'\n"
                "    frequencies = count_word_frequencies(passage)\n"
                "    print('Passage:', passage)\n"
                "    print('Counts :', frequencies)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Word Frequency Counter", ["Text Sanitization", "Token Splitting", "Increment via .get()", "Frequency Mapping"], code
    elif category == "intermediate":
        if sub_lvl == "1":
            code = (
                "def main():\n"
                "    print('=== Dictionary Comprehensions and Inversion (Intermediate L1) ===')\n"
                "    scores = {'Alice': 95, 'Bob': 82, 'Charlie': 91, 'Diana': 78}\n"
                "    grade_map = {name: ('A' if s >= 90 else 'B') for name, s in scores.items()}\n"
                "    inverted = {v: k for k, v in grade_map.items()}\n"
                "    print('Original scores:', scores)\n"
                "    print('Grade mapping  :', grade_map)\n"
                "    print('Inverted map   :', inverted)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Dict Comprehensions", ["Comprehension Syntax", "Conditional Value Mapping", "Key-Value Inversion", "Data Transformation"], code
        elif sub_lvl == "2":
            code = (
                "from collections import defaultdict\n\n"
                "def main():\n"
                "    employees = [\n"
                "        ('Eng', 'Rohan'), ('Sales', 'Meera'), ('Eng', 'Amit'), ('HR', 'Sneha')\n"
                "    ]\n"
                "    grouped = defaultdict(list)\n"
                "    for dept, name in employees:\n"
                "        grouped[dept].append(name)\n"
                "    print('=== Grouping with defaultdict (Intermediate L2) ===')\n"
                "    for dept, names in grouped.items():\n"
                "        print(f'{dept:8}: {names}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Defaultdict Grouping", ["collections.defaultdict", "Automatic List Factory", "Grouping Aggregations", "Iteration over Groups"], code
        else: # L3
            code = (
                "def main():\n"
                "    default_cfg = {'host': 'localhost', 'port': 8080, 'timeout': 30}\n"
                "    override_cfg = {'port': 9000, 'debug': True}\n"
                "    merged_pipe = default_cfg | override_cfg\n"
                "    merged_unpack = {**default_cfg, **override_cfg}\n"
                "    print('=== Merging Dictionaries (Intermediate L3) ===')\n"
                "    print('Merged (| op)    :', merged_pipe)\n"
                "    print('Merged (** unpack):', merged_unpack)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Dictionary Merging", ["Merge Operator (|)", "Double Asterisk Unpack", "Collision Overrides", "Configuration Assembler"], code
    else: # advanced
        if sub_lvl == "1":
            code = (
                "class Trie:\n"
                "    def __init__(self):\n"
                "        self.root = {}\n"
                "    def insert(self, word: str):\n"
                "        node = self.root\n"
                "        for ch in word:\n"
                "            node = node.setdefault(ch, {})\n"
                "        node['$'] = True\n"
                "    def search(self, word: str) -> bool:\n"
                "        node = self.root\n"
                "        for ch in word:\n"
                "            if ch not in node: return False\n"
                "            node = node[ch]\n"
                "        return '$' in node\n\n"
                "def main():\n"
                "    print('=== Trie Prefix Tree using Nested Dictionaries (Advanced L1) ===')\n"
                "    trie = Trie()\n"
                "    for w in ['apple', 'app', 'application']: trie.insert(w)\n"
                "    print('search(app)    :', trie.search('app'))\n"
                "    print('search(appl)   :', trie.search('appl'))\n"
                "    print('search(banana) :', trie.search('banana'))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Trie Prefix Tree", ["Nested Dict Tree", "setdefault Character Insertion", "Sentinel Word Terminator", "Prefix Search Validation"], code
        elif sub_lvl == "2":
            code = (
                "from collections import ChainMap\n\n"
                "def main():\n"
                "    cli_args = {'port': 5000}\n"
                "    env_vars = {'port': 8080, 'auth': 'oauth2'}\n"
                "    defaults = {'port': 80, 'auth': 'basic', 'workers': 4}\n"
                "    config = ChainMap(cli_args, env_vars, defaults)\n"
                "    print('=== ChainMap Multi-Scope Configuration (Advanced L2) ===')\n"
                "    print('Active port   :', config['port'])\n"
                "    print('Active auth   :', config['auth'])\n"
                "    print('Active workers:', config['workers'])\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "ChainMap Scope Manager", ["collections.ChainMap", "Multi-Scope Layering", "Priority Fallbacks", "Config Resolution"], code
        else: # L3
            code = (
                "import time\n"
                "import threading\n\n"
                "class TTLCache:\n"
                "    def __init__(self):\n"
                "        self._store = {}\n"
                "        self._lock = threading.Lock()\n"
                "    def set(self, key, val, ttl_seconds: float):\n"
                "        with self._lock:\n"
                "            self._store[key] = (val, time.time() + ttl_seconds)\n"
                "    def get(self, key):\n"
                "        with self._lock:\n"
                "            if key not in self._store: return None\n"
                "            val, expiry = self._store[key]\n"
                "            if time.time() > expiry:\n"
                "                del self._store[key]\n"
                "                return None\n"
                "            return val\n\n"
                "def main():\n"
                "    print('=== Thread-Safe TTL Cache with Dictionary (Advanced L3) ===')\n"
                "    cache = TTLCache()\n"
                "    cache.set('session_token', 'TOKEN_XYZ123', ttl_seconds=0.1)\n"
                "    print('Immediate get:', cache.get('session_token'))\n"
                "    time.sleep(0.12)\n"
                "    print('After expiry :', cache.get('session_token'))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Thread-Safe TTL Cache", ["Lock Mutex Synchronization", "Timestamp Expiry Tuple", "Lazy Expiry Eviction", "Thread-Safe Dictionary"], code

# =========================================================================
# 9. TUPLE (9 GENUINELY DIFFERENT PYTHON PROGRAMS)
# =========================================================================

def get_python_tuple(category: str, sub_lvl: str) -> Tuple[str, List[str], str]:
    if category == "beginner":
        if sub_lvl == "1":
            code = (
                "def main():\n"
                "    point = (10, 20, 30)\n"
                "    print('=== Tuple Immutability and Indexing (Beginner L1) ===')\n"
                "    print('Point tuple :', point)\n"
                "    print('X coordinate:', point[0])\n"
                "    print('Y coordinate:', point[1])\n"
                "    print('Slice [1:]   :', point[1:])\n"
                "    print('Tuple length :', len(point))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Tuple Immutability", ["Tuple Syntax", "Zero-based Indexing", "Immutability Principle", "Slice Extraction"], code
        elif sub_lvl == "2":
            code = (
                "def get_min_max(numbers: list) -> tuple:\n"
                "    return min(numbers), max(numbers)\n\n"
                "def main():\n"
                "    print('=== Tuple Unpacking and Swapping (Beginner L2) ===')\n"
                "    a, b = 100, 200\n"
                "    print(f'Before swap: a={a}, b={b}')\n"
                "    a, b = b, a\n"
                "    print(f'After swap : a={a}, b={b}')\n"
                "    data = [45, 12, 89, 3, 67]\n"
                "    lowest, highest = get_min_max(data)\n"
                "    print(f'Extracted: lowest={lowest}, highest={highest}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Tuple Unpacking & Swapping", ["Variable Swapping Invariant", "Multiple Assignment", "Function Return Unpacking", "Scalar Binding"], code
        else: # L3
            code = (
                "def main():\n"
                "    print('=== Extended Unpacking & Concatenation (Beginner L3) ===')\n"
                "    record = ('USR-001', 'Alice', 'Engineer', 95000, 'Bengaluru')\n"
                "    user_id, *details, location = record\n"
                "    print('User ID :', user_id)\n"
                "    print('Details :', details)\n"
                "    print('Location:', location)\n"
                "    combined = (1, 2) + (3, 4)\n"
                "    print('Concatenated tuple:', combined)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Extended Tuple Unpacking", ["Starred *details Expression", "Head-Tail Partitioning", "Tuple Concatenation", "Immutable Structure Preservation"], code
    elif category == "intermediate":
        if sub_lvl == "1":
            code = (
                "from collections import namedtuple\n\n"
                "def main():\n"
                "    print('=== Structured Records with namedtuple (Intermediate L1) ===')\n"
                "    City = namedtuple('City', ['name', 'country', 'population'])\n"
                "    c1 = City('Tokyo', 'Japan', 37400000)\n"
                "    c2 = City('Paris', 'France', 2161000)\n"
                "    print(f'{c1.name} in {c1.country} has population {c1.population:,}')\n"
                "    print('Access by index [0]:', c2[0])\n"
                "    print('As dictionary:', c1._asdict())\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Namedtuple Records", ["collections.namedtuple Factory", "Field Attribute Access", "Index Backward-Compatibility", "_asdict Serialization"], code
        elif sub_lvl == "2":
            code = (
                "def main():\n"
                "    print('=== Tuples as Immutable Dictionary Keys (Intermediate L2) ===')\n"
                "    grid_weights = {\n"
                "        (0, 0): 'Origin',\n"
                "        (0, 1): 'North Hub',\n"
                "        (1, 0): 'East Hub',\n"
                "        (1, 1): 'Crossroads'\n"
                "    }\n"
                "    query = (1, 0)\n"
                "    print(f'Location at {query}: {grid_weights.get(query, \"Unknown\")}')\n"
                "    print('All grid coordinates:', list(grid_weights.keys()))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Tuples as Dict Keys", ["Coordinate Hashing", "Immutable Key Invariant", "Grid Map Representation", "Constant Time Lookup"], code
        else: # L3
            code = (
                "def main():\n"
                "    print('=== Sorting with Composite Tuple Keys (Intermediate L3) ===')\n"
                "    students = [\n"
                "        ('Alice', 85, 20), ('Bob', 90, 22), ('Charlie', 85, 19), ('Diana', 90, 21)\n"
                "    ]\n"
                "    sorted_students = sorted(students, key=lambda s: (-s[1], s[2]))\n"
                "    print('Original:', students)\n"
                "    print('Sorted by Score (desc), then Age (asc):')\n"
                "    for name, score, age in sorted_students:\n"
                "        print(f'  {name:8}: Score {score}, Age {age}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Composite Tuple Sorting", ["Multi-Criteria lambda Key", "Negative Scalar Inversion", "Lexicographical Comparison", "Stable Tie-Breaking"], code
    else: # advanced
        if sub_lvl == "1":
            code = (
                "from typing import NamedTuple\n\n"
                "class GeoLocation(NamedTuple):\n"
                "    latitude: float\n"
                "    longitude: float\n"
                "    label: str = 'Waypoint'\n\n"
                "def main():\n"
                "    print('=== Typing NamedTuple with Type Annotations (Advanced L1) ===')\n"
                "    loc = GeoLocation(12.9716, 77.5946, 'Bengaluru HQ')\n"
                "    print('Location:', loc)\n"
                "    print(f'Coordinates: ({loc.latitude}, {loc.longitude})')\n"
                "    print('Fields:', GeoLocation._fields)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Typing NamedTuple", ["typing.NamedTuple Base", "Static Type Signatures", "Default Field Parameters", "Field Introspection"], code
        elif sub_lvl == "2":
            code = (
                "def memoize(func):\n"
                "    cache = {}\n"
                "    def wrapper(*args):\n"
                "        key = tuple(args)\n"
                "        if key not in cache:\n"
                "            cache[key] = func(*args)\n"
                "        return cache[key]\n"
                "    return wrapper\n\n"
                "@memoize\n"
                "def grid_paths(m: int, n: int) -> int:\n"
                "    if m == 1 or n == 1: return 1\n"
                "    return grid_paths(m - 1, n) + grid_paths(m, n - 1)\n\n"
                "def main():\n"
                "    print('=== Multi-Argument Tuple Cache Keys (Advanced L2) ===')\n"
                "    paths = grid_paths(10, 10)\n"
                "    print('Unique paths in 10x10 grid:', paths)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Tuple Memoization Keys", ["Argument Tuple Serialization", "Dynamic Cache Hashing", "Recursive Grid Reduction", "Memoized Acceleration"], code
        else: # L3
            code = (
                "from dataclasses import dataclass\n\n"
                "@dataclass(frozen=True)\n"
                "class Money:\n"
                "    amount: float\n"
                "    currency: str\n"
                "    def __add__(self, other: 'Money') -> 'Money':\n"
                "        if self.currency != other.currency:\n"
                "            raise ValueError('Currency mismatch')\n"
                "        return Money(self.amount + other.amount, self.currency)\n\n"
                "def main():\n"
                "    print('=== Immutable Value Object Pattern (Advanced L3) ===')\n"
                "    m1 = Money(100.0, 'USD')\n"
                "    m2 = Money(50.0, 'USD')\n"
                "    m3 = m1 + m2\n"
                "    print('m1:', m1)\n"
                "    print('m2:', m2)\n"
                "    print('m1 + m2:', m3)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Immutable Value Object", ["frozen=True Invariant", "Type Safety Validation", "Value Equality Contract", "Domain Driven Architecture"], code

# =========================================================================
# 10. SET (9 GENUINELY DIFFERENT PYTHON PROGRAMS)
# =========================================================================

def get_python_set(category: str, sub_lvl: str) -> Tuple[str, List[str], str]:
    if category == "beginner":
        if sub_lvl == "1":
            code = (
                "def main():\n"
                "    tags = {'python', 'coding', 'ai'}\n"
                "    print('=== Set Uniqueness and Membership (Beginner L1) ===')\n"
                "    tags.add('machine-learning')\n"
                "    tags.add('python')  # Duplicate ignored\n"
                "    print('Set elements:', tags)\n"
                "    print(\"Has 'ai'?\", 'ai' in tags)\n"
                "    tags.discard('coding')\n"
                "    print('After discard:', tags)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Set Uniqueness", ["Set Definition", "add() Idempotence", "Membership in Testing", "discard() Safe Removal"], code
        elif sub_lvl == "2":
            code = (
                "def main():\n"
                "    frontend = {'HTML', 'CSS', 'JavaScript', 'TypeScript'}\n"
                "    backend = {'Python', 'Java', 'TypeScript', 'SQL'}\n"
                "    print('=== Set Mathematical Operations (Beginner L2) ===')\n"
                "    print('Union (All skills)          :', frontend | backend)\n"
                "    print('Intersection (Fullstack)    :', frontend & backend)\n"
                "    print('Difference (Frontend only)  :', frontend - backend)\n"
                "    print('Symmetric Diff (Exclusive)  :', frontend ^ backend)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Set Mathematical Operations", ["Union Operator (|)", "Intersection Operator (&)", "Difference Operator (-)", "Symmetric Difference (^)"], code
        else: # L3
            code = (
                "def deduplicate_preserve_order(items: list) -> list:\n"
                "    seen = set()\n"
                "    result = []\n"
                "    for item in items:\n"
                "        if item not in seen:\n"
                "            seen.add(item)\n"
                "            result.append(item)\n"
                "    return result\n\n"
                "def main():\n"
                "    print('=== Deduplication Preserving Order (Beginner L3) ===')\n"
                "    stream = [10, 20, 10, 30, 20, 40, 50, 30]\n"
                "    unique = deduplicate_preserve_order(stream)\n"
                "    print('Raw stream:', stream)\n"
                "    print('Deduped   :', unique)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Deduplication Preserving Order", ["Auxiliary Seen Set", "Membership Filter Guard", "Linear Gather Append", "Insertion Order Retention"], code
    elif category == "intermediate":
        if sub_lvl == "1":
            code = (
                "def main():\n"
                "    required_perms = {'READ', 'WRITE'}\n"
                "    admin_perms = {'READ', 'WRITE', 'DELETE', 'EXECUTE'}\n"
                "    guest_perms = {'READ'}\n"
                "    print('=== Set Relationship Checks (Intermediate L1) ===')\n"
                "    print('Admin has all required (issuperset):', admin_perms.issuperset(required_perms))\n"
                "    print('Guest is subset of required         :', guest_perms.issubset(required_perms))\n"
                "    print('Disjoint check                      :', guest_perms.isdisjoint({'DELETE'}))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Set Relationships", ["issuperset Validation", "issubset Inclusion", "isdisjoint Mutual Exclusivity", "Permission Security Matrix"], code
        elif sub_lvl == "2":
            code = (
                "def main():\n"
                "    text = 'To be or not to be that is the question'\n"
                "    unique_vowels = {ch for ch in text.lower() if ch in 'aeiou'}\n"
                "    unique_word_lengths = {len(w) for w in text.split()}\n"
                "    print('=== Set Comprehensions (Intermediate L2) ===')\n"
                "    print('Vowels present in text:', sorted(unique_vowels))\n"
                "    print('Distinct word lengths :', sorted(unique_word_lengths))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Set Comprehensions", ["Set Comprehension Syntax", "Predicate Filtering", "Scalar Set Unification", "Sorted View Conversion"], code
        else: # L3
            code = (
                "def main():\n"
                "    print('=== Frozenset Immutable Hashable Sets (Intermediate L3) ===')\n"
                "    group_a = frozenset(['Alice', 'Bob'])\n"
                "    group_b = frozenset(['Charlie', 'Diana'])\n"
                "    project_assignments = {group_a: 'Project Alpha', group_b: 'Project Beta'}\n"
                "    print('Frozenset dict lookup:', project_assignments[group_a])\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Frozenset Hashable Keys", ["frozenset Instantiation", "Dictionary Key Hashing", "Immutability Invariant", "Group Identifier Mapping"], code
    else: # advanced
        if sub_lvl == "1":
            code = (
                "def document_similarity(doc1: str, doc2: str) -> float:\n"
                "    w1 = set(doc1.lower().split())\n"
                "    w2 = set(doc2.lower().split())\n"
                "    jaccard = len(w1 & w2) / len(w1 | w2) if (w1 | w2) else 0.0\n"
                "    return jaccard\n\n"
                "def main():\n"
                "    print('=== Jaccard Document Similarity (Advanced L1) ===')\n"
                "    d1 = 'machine learning with python and neural networks'\n"
                "    d2 = 'deep learning with python and neural networks'\n"
                "    sim = document_similarity(d1, d2)\n"
                "    print(f'Jaccard Similarity Score: {sim:.4f}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Jaccard Set Similarity", ["Vocabulary Tokenization", "Set Intersection Overlap", "Set Union Span", "Metric Coefficient"], code
        elif sub_lvl == "2":
            code = (
                "class DisjointSetUnion:\n"
                "    def __init__(self, elements):\n"
                "        self.parent = {x: x for x in elements}\n"
                "    def find(self, i):\n"
                "        if self.parent[i] == i: return i\n"
                "        self.parent[i] = self.find(self.parent[i])\n"
                "        return self.parent[i]\n"
                "    def union(self, i, j):\n"
                "        root_i = self.find(i)\n"
                "        root_j = self.find(j)\n"
                "        if root_i != root_j: self.parent[root_i] = root_j\n\n"
                "def main():\n"
                "    print('=== Disjoint Set Union (DSU) Algorithm (Advanced L2) ===')\n"
                "    dsu = DisjointSetUnion(['A', 'B', 'C', 'D'])\n"
                "    dsu.union('A', 'B'); dsu.union('B', 'C')\n"
                "    print('Are A and C connected?', dsu.find('A') == dsu.find('C'))\n"
                "    print('Are A and D connected?', dsu.find('A') == dsu.find('D'))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Disjoint Set Union", ["Representative Path Compression", "Union By Rooting", "Transitive Equivalence", "O(alpha(N)) Efficiency"], code
        else: # L3
            code = (
                "class SimulatedBloomFilter:\n"
                "    def __init__(self, size: int = 100):\n"
                "        self.size = size\n"
                "        self.bits = [0] * size\n"
                "    def _hashes(self, item: str):\n"
                "        h1 = hash(item) % self.size\n"
                "        h2 = (hash(item) * 31 + 17) % self.size\n"
                "        return h1, h2\n"
                "    def add(self, item: str):\n"
                "        for h in self._hashes(item): self.bits[h] = 1\n"
                "    def might_contain(self, item: str) -> bool:\n"
                "        return all(self.bits[h] == 1 for h in self._hashes(item))\n\n"
                "def main():\n"
                "    print('=== Bloom Filter Probabilistic Set (Advanced L3) ===')\n"
                "    bf = SimulatedBloomFilter(50)\n"
                "    bf.add('alice@example.com')\n"
                "    print('Might contain alice@...:', bf.might_contain('alice@example.com'))\n"
                "    print('Might contain bob@...  :', bf.might_contain('bob@example.com'))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Bloom Filter Simulation", ["Multi-Hash Distribution", "Bit Array Encoding", "Probabilistic Membership Query", "Zero False Negative Guarantee"], code

# =========================================================================
# 11. FILE HANDLING (9 GENUINELY DIFFERENT PYTHON PROGRAMS)
# =========================================================================

def get_python_file_handling(category: str, sub_lvl: str) -> Tuple[str, List[str], str]:
    if category == "beginner":
        if sub_lvl == "1":
            code = (
                "import os\n\n"
                "def main():\n"
                "    filename = 'ksai_sample.txt'\n"
                "    print('=== Text File Write and Read (Beginner L1) ===')\n"
                "    with open(filename, 'w', encoding='utf-8') as f:\n"
                "        f.write('KnowledgeStream AI Dictator\\nStep-by-step Mastery\\n')\n"
                "    with open(filename, 'r', encoding='utf-8') as f:\n"
                "        content = f.read()\n"
                "    print('File contents read back:')\n"
                "    print(content)\n"
                "    if os.path.exists(filename): os.remove(filename)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Text File Write & Read", ["with open Context Manager", "UTF-8 Encoding Specification", "read() Retrieval", "Cleanup Teardown"], code
        elif sub_lvl == "2":
            code = (
                "import os\n\n"
                "def main():\n"
                "    filename = 'ksai_lines.txt'\n"
                "    print('=== Line-by-Line File Processing (Beginner L2) ===')\n"
                "    data = ['First entry\\n', 'Second entry\\n', 'Third entry\\n']\n"
                "    with open(filename, 'w') as f: f.writelines(data)\n"
                "    with open(filename, 'r') as f:\n"
                "        for idx, line in enumerate(f, start=1):\n"
                "            print(f'Line {idx}: {line.strip()}')\n"
                "    if os.path.exists(filename): os.remove(filename)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Line-by-Line Processing", ["writelines() Batch Write", "File Pointer Iterator", "strip() Whitespace Clean", "Line Indexing"], code
        else: # L3
            code = (
                "import os\n\n"
                "def append_audit_log(filename: str, log_message: str):\n"
                "    with open(filename, 'a', encoding='utf-8') as f:\n"
                "        f.write(f'[AUDIT] {log_message}\\n')\n\n"
                "def main():\n"
                "    print('=== Appending to Files and Existence Check (Beginner L3) ===')\n"
                "    log_file = 'audit.log'\n"
                "    append_audit_log(log_file, 'User login at 10:00 AM')\n"
                "    append_audit_log(log_file, 'Database backup started')\n"
                "    print(f'File exists: {os.path.exists(log_file)}')\n"
                "    with open(log_file, 'r') as f: print(f.read())\n"
                "    if os.path.exists(log_file): os.remove(log_file)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "File Append & Existence", ["Append Mode ('a')", "Audit Trail Generation", "os.path.exists Verification", "Safe Cleanup"], code
    elif category == "intermediate":
        if sub_lvl == "1":
            code = (
                "import csv\n"
                "import io\n\n"
                "def main():\n"
                "    print('=== Structured CSV Parsing and Generation (Intermediate L1) ===')\n"
                "    stream = io.StringIO()\n"
                "    writer = csv.writer(stream)\n"
                "    writer.writerow(['ID', 'Name', 'Department', 'Score'])\n"
                "    writer.writerow([101, 'Alex', 'AI', 94])\n"
                "    writer.writerow([102, 'Sara', 'DevOps', 88])\n"
                "    stream.seek(0)\n"
                "    reader = csv.DictReader(stream)\n"
                "    for row in reader:\n"
                "        print(f'Employee #{row[\"ID\"]}: {row[\"Name\"]} ({row[\"Department\"]}) -> {row[\"Score\"]} pts')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Structured CSV I/O", ["csv.writer Row Output", "DictReader Column Mapping", "io.StringIO Virtual Stream", "Tabular Structuring"], code
        elif sub_lvl == "2":
            code = (
                "import json\n\n"
                "def main():\n"
                "    print('=== JSON Serialization and Deserialization (Intermediate L2) ===')\n"
                "    payload = {\n"
                "        'service': 'Codenthra-AI',\n"
                "        'version': 8.0,\n"
                "        'features': ['Dictator', 'Mentor', 'Guide'],\n"
                "        'active': True\n"
                "    }\n"
                "    json_str = json.dumps(payload, indent=2)\n"
                "    print('Serialized JSON:\\n', json_str)\n"
                "    decoded = json.loads(json_str)\n"
                "    print(f'Decoded service: {decoded[\"service\"]} (Active: {decoded[\"active\"]})')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "JSON Serialization", ["json.dumps Pretty Printing", "json.loads Parsing", "Type Coercion Verification", "Nested Structure Preservation"], code
        else: # L3
            code = (
                "import os\n"
                "import tempfile\n\n"
                "def safe_replace_file(filepath: str, new_content: str):\n"
                "    dir_name = os.path.dirname(filepath) or '.'\n"
                "    with tempfile.NamedTemporaryFile('w', dir=dir_name, delete=False) as tf:\n"
                "        tf.write(new_content)\n"
                "        temp_name = tf.name\n"
                "    os.replace(temp_name, filepath)\n\n"
                "def main():\n"
                "    print('=== Safe Atomic File Replacement (Intermediate L3) ===')\n"
                "    target = 'atomic_test.txt'\n"
                "    safe_replace_file(target, 'Version 1.0 content')\n"
                "    safe_replace_file(target, 'Version 2.0 updated atomically!')\n"
                "    with open(target, 'r') as f: print('Final content:', f.read())\n"
                "    if os.path.exists(target): os.remove(target)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Atomic File Replacement", ["tempfile Staged Write", "os.replace Atomic Rename", "Fault-Tolerant File Update", "Zero Corruptions Guard"], code
    else: # advanced
        if sub_lvl == "1":
            code = (
                "import struct\n"
                "import io\n\n"
                "def main():\n"
                "    print('=== Binary File I/O and Struct Packing (Advanced L1) ===')\n"
                "    buffer = io.BytesIO()\n"
                "    header = struct.pack('>4sHH', b'KSAI', 1, 42)  # Magic, Ver, PayloadID\n"
                "    buffer.write(header)\n"
                "    buffer.seek(0)\n"
                "    magic, ver, p_id = struct.unpack('>4sHH', buffer.read(8))\n"
                "    print(f'Magic Header: {magic.decode()} | Version: {ver} | PayloadID: {p_id}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Binary Struct I/O", ["struct.pack Binary Encoding", "Big-Endian Formatting", "struct.unpack Field Extraction", "Magic Byte Validation"], code
        elif sub_lvl == "2":
            code = (
                "import io\n\n"
                "def chunked_stream_processor(stream: io.StringIO, chunk_size: int = 16):\n"
                "    total_bytes = 0\n"
                "    while True:\n"
                "        chunk = stream.read(chunk_size)\n"
                "        if not chunk: break\n"
                "        total_bytes += len(chunk)\n"
                "        yield chunk\n"
                "    return total_bytes\n\n"
                "def main():\n"
                "    print('=== Memory-Efficient Stream Chunking (Advanced L2) ===')\n"
                "    data_source = io.StringIO('A' * 35 + 'B' * 25)\n"
                "    for idx, chunk in enumerate(chunked_stream_processor(data_source, 20), start=1):\n"
                "        print(f'Chunk #{idx}: len={len(chunk)}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Stream Chunking Processor", ["Generator Chunk Yield", "Bounded Memory Footprint", "EOF Termination Protocol", "Large Stream Handling"], code
        else: # L3
            code = (
                "import os\n\n"
                "class TransactionalFileEditor:\n"
                "    def __init__(self, filename: str):\n"
                "        self.filename = filename\n"
                "        self.backup_name = filename + '.bak'\n"
                "    def __enter__(self):\n"
                "        if os.path.exists(self.filename):\n"
                "            import shutil; shutil.copy2(self.filename, self.backup_name)\n"
                "        return self\n"
                "    def __exit__(self, exc_type, exc_val, exc_tb):\n"
                "        if exc_type is not None and os.path.exists(self.backup_name):\n"
                "            os.replace(self.backup_name, self.filename)\n"
                "            print('[ROLLBACK] Restored backup due to exception.')\n"
                "        elif os.path.exists(self.backup_name):\n"
                "            os.remove(self.backup_name)\n"
                "        return False\n\n"
                "def main():\n"
                "    print('=== Transactional File Editor Context Manager (Advanced L3) ===')\n"
                "    fname = 'trans_test.txt'\n"
                "    with open(fname, 'w') as f: f.write('Initial Valid State')\n"
                "    with TransactionalFileEditor(fname):\n"
                "        with open(fname, 'w') as f: f.write('Committed Updates')\n"
                "    with open(fname, 'r') as f: print('Result:', f.read())\n"
                "    if os.path.exists(fname): os.remove(fname)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Transactional File Manager", ["Snapshot Backup Creation", "Exception Rollback Protocol", "Commit Cleanup Teardown", "ACID File Mutation"], code

# -*- coding: utf-8 -*-
# Part 3: Exception Handling, Multithreading, Recursion, Searching, Sorting, Database, API, Dynamic Topic, Dispatcher

# =========================================================================
# 12. EXCEPTION HANDLING (9 GENUINELY DIFFERENT PYTHON PROGRAMS)
# =========================================================================

def get_python_exception_handling(category: str, sub_lvl: str) -> Tuple[str, List[str], str]:
    if category == "beginner":
        if sub_lvl == "1":
            code = (
                "def safe_divide(a: float, b: float):\n"
                "    try:\n"
                "        return a / b\n"
                "    except ZeroDivisionError:\n"
                "        print('Error: Attempted division by zero!')\n"
                "        return None\n\n"
                "def main():\n"
                "    print('=== Basic try...except Handling (Beginner L1) ===')\n"
                "    print('10 / 2 =', safe_divide(10, 2))\n"
                "    print('10 / 0 =', safe_divide(10, 0))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Basic Try-Except", ["try Block Encapsulation", "ZeroDivisionError Interception", "Safe Graceful Recovery", "None Fallback Return"], code
        elif sub_lvl == "2":
            code = (
                "def parse_user_age(raw_input: str):\n"
                "    try:\n"
                "        age = int(raw_input)\n"
                "        if age < 0: raise ValueError('Age cannot be negative')\n"
                "    except ValueError as e:\n"
                "        print(f'Validation failure: {e}')\n"
                "    except TypeError:\n"
                "        print('Type error: Input must be string convertible to int')\n"
                "    else:\n"
                "        print(f'Successfully validated age: {age}')\n\n"
                "def main():\n"
                "    print('=== Multiple Except Blocks and Else (Beginner L2) ===')\n"
                "    parse_user_age('25')\n"
                "    parse_user_age('-5')\n"
                "    parse_user_age('twenty')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Multiple Except & Else", ["Specific Exception Branches", "ValueError Condition Check", "else Block Execution", "Exception Parameter Binding"], code
        else: # L3
            code = (
                "def process_resource():\n"
                "    resource_acquired = False\n"
                "    try:\n"
                "        print('[RESOURCE] Acquired lock on shared file.')\n"
                "        resource_acquired = True\n"
                "        result = 100 // 5\n"
                "        print(f'[RESOURCE] Computation output: {result}')\n"
                "    finally:\n"
                "        if resource_acquired:\n"
                "            print('[RESOURCE] Cleanup: Released lock in finally block.')\n\n"
                "def main():\n"
                "    print('=== Finally Block Guaranteed Cleanup (Beginner L3) ===')\n"
                "    process_resource()\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Guaranteed Cleanup Finally", ["Guaranteed Execution Invariant", "Resource Acquisition Tracking", "finally Block Teardown", "Clean Lock Release"], code
    elif category == "intermediate":
        if sub_lvl == "1":
            code = (
                "def parse_config_setting(key: str, data: dict):\n"
                "    try:\n"
                "        return data[key]\n"
                "    except KeyError as err:\n"
                "        print(f'[LOG] Missing setting key: {err.args[0]}')\n"
                "        raise\n\n"
                "def main():\n"
                "    print('=== Exception Introspection & Re-Raising (Intermediate L1) ===')\n"
                "    try:\n"
                "        parse_config_setting('timeout', {'host': '127.0.0.1'})\n"
                "    except KeyError:\n"
                "        print('[MAIN] Caught re-raised KeyError at top level.')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Introspection & Re-Raising", ["Exception Argument Inspection", "Audit Logging Before Raise", "raise Bare Re-Raising", "Top-Level Handling"], code
        elif sub_lvl == "2":
            code = (
                "def validate_email_address(email: str):\n"
                "    if not isinstance(email, str):\n"
                "        raise TypeError(f'Expected str, got {type(email).__name__}')\n"
                "    if '@' not in email or '.' not in email.split('@')[-1]:\n"
                "        raise ValueError(f'Malformed email address: {email}')\n"
                "    return True\n\n"
                "def main():\n"
                "    print('=== Conditional Raising & Domain Validation (Intermediate L2) ===')\n"
                "    for test in ['valid@example.com', 'bad_email', 123]:\n"
                "        try:\n"
                "            validate_email_address(test)\n"
                "            print(f'Passed: {test}')\n"
                "        except (ValueError, TypeError) as err:\n"
                "            print(f'Rejected {test}: {err}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Conditional Validation", ["Type Checking with isinstance", "Custom Error Messages", "Tuple of Exception Types", "Validation Invariants"], code
        else: # L3
            code = (
                "class BankingError(Exception):\n"
                "    def __init__(self, code: str, msg: str):\n"
                "        super().__init__(msg)\n"
                "        self.code = code\n\n"
                "class OverdraftError(BankingError):\n"
                "    def __init__(self, deficit: float):\n"
                "        super().__init__('ERR_OVERDRAFT', f'Overdraft by ${deficit:.2f}')\n"
                "        self.deficit = deficit\n\n"
                "def main():\n"
                "    print('=== Custom Exception Hierarchy (Intermediate L3) ===')\n"
                "    try:\n"
                "        raise OverdraftError(45.50)\n"
                "    except BankingError as e:\n"
                "        print(f'Caught Banking Exception [{e.code}]: {e}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Custom Exception Hierarchy", ["Domain Base Exception", "Inherited Error Codes", "Deficit Attribute Metadata", "Hierarchical Catching"], code
    else: # advanced
        if sub_lvl == "1":
            code = (
                "class DatabaseFetchError(Exception): pass\n\n"
                "def query_database(record_id: int):\n"
                "    try:\n"
                "        raise ConnectionRefusedError('Database port 5432 unreachable')\n"
                "    except ConnectionRefusedError as orig_err:\n"
                "        raise DatabaseFetchError(f'Failed retrieving record #{record_id}') from orig_err\n\n"
                "def main():\n"
                "    print('=== Exception Chaining with from Syntax (Advanced L1) ===')\n"
                "    try:\n"
                "        query_database(42)\n"
                "    except DatabaseFetchError as err:\n"
                "        print('High-level error:', err)\n"
                "        print('Root cause error:', err.__cause__)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Exception Chaining", ["raise ... from Chaining", "__cause__ Root Inspection", "Context Preservation", "Layered Architecture Abstraction"], code
        elif sub_lvl == "2":
            code = (
                "import functools\n\n"
                "def error_guard(fallback_value):\n"
                "    def decorator(fn):\n"
                "        @functools.wraps(fn)\n"
                "        def wrapper(*args, **kwargs):\n"
                "            try:\n"
                "                return fn(*args, **kwargs)\n"
                "            except Exception as e:\n"
                "                print(f'[GUARD] Handled exception in {fn.__name__}: {e}')\n"
                "                return fallback_value\n"
                "        return wrapper\n"
                "    return decorator\n\n"
                "@error_guard(fallback_value={'status': 'DEGRADED'})\n"
                "def fetch_api_status():\n"
                "    raise TimeoutError('Remote host took too long')\n\n"
                "def main():\n"
                "    print('=== Error Guard Decorator Architecture (Advanced L2) ===')\n"
                "    res = fetch_api_status()\n"
                "    print('Guarded return:', res)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Error Guard Decorator", ["Parametric Error Decorator", "Fallback Interception", "Zero-Crash Guarantee", "Telemetry Logging"], code
        else: # L3
            code = (
                "class ValidationAggregator:\n"
                "    def __init__(self):\n"
                "        self.errors = []\n"
                "    def check(self, condition: bool, error_msg: str):\n"
                "        if not condition: self.errors.append(error_msg)\n"
                "    def validate(self):\n"
                "        if self.errors:\n"
                "            raise ValueError('Validation failures: ' + '; '.join(self.errors))\n\n"
                "def main():\n"
                "    print('=== Multi-Error Accumulator Pattern (Advanced L3) ===')\n"
                "    agg = ValidationAggregator()\n"
                "    user_payload = {'username': 'al', 'email': 'bad_email', 'age': 15}\n"
                "    agg.check(len(user_payload['username']) >= 3, 'Username too short')\n"
                "    agg.check('@' in user_payload['email'], 'Invalid email syntax')\n"
                "    agg.check(user_payload['age'] >= 18, 'Must be at least 18')\n"
                "    try:\n"
                "        agg.validate()\n"
                "    except ValueError as err:\n"
                "        print('Aggregated errors caught:', err)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Multi-Error Accumulator", ["Error List Gathering", "Composite Validation Invariant", "Batch Failure Reporting", "Deterministic Reporting"], code


# =========================================================================
# 13. MULTITHREADING (9 GENUINELY DIFFERENT PYTHON PROGRAMS)
# =========================================================================

def get_python_multithreading(category: str, sub_lvl: str) -> Tuple[str, List[str], str]:
    if category == "beginner":
        if sub_lvl == "1":
            code = (
                "import threading\n"
                "import time\n\n"
                "def task_worker(task_name: str):\n"
                "    print(f'Starting {task_name}')\n"
                "    time.sleep(0.02)\n"
                "    print(f'Finished {task_name}')\n\n"
                "def main():\n"
                "    print('=== Thread Creation and Join (Beginner L1) ===')\n"
                "    t1 = threading.Thread(target=task_worker, args=('Worker-1',))\n"
                "    t2 = threading.Thread(target=task_worker, args=('Worker-2',))\n"
                "    t1.start(); t2.start()\n"
                "    t1.join(); t2.join()\n"
                "    print('Both threads joined. Main thread resumes.')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Thread Creation & Join", ["threading.Thread Instantiation", "target & args Parameters", "start() Dispatch", "join() Synchronization"], code
        elif sub_lvl == "2":
            code = (
                "import threading\n\n"
                "def compute_square(num: int, results: dict):\n"
                "    ident = threading.get_ident()\n"
                "    results[num] = (num ** 2, ident)\n\n"
                "def main():\n"
                "    print('=== Spawning Concurrent Worker Threads (Beginner L2) ===')\n"
                "    numbers = [2, 4, 6, 8]\n"
                "    results = {}\n"
                "    threads = [threading.Thread(target=compute_square, args=(n, results)) for n in numbers]\n"
                "    for t in threads: t.start()\n"
                "    for t in threads: t.join()\n"
                "    for n in numbers:\n"
                "        val, tid = results[n]\n"
                "        print(f'Square of {n:2d} = {val:2d} (computed on thread {tid})')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Multiple Worker Threads", ["Thread List Comprehension", "Thread ID Inspection", "Parallel Parameter Passing", "Coordinated Gathering"], code
        else: # L3
            code = (
                "import threading\n"
                "import time\n\n"
                "def background_heartbeat():\n"
                "    while True:\n"
                "        time.sleep(0.01)\n\n"
                "def main():\n"
                "    print('=== Daemon Threads and Thread Inspection (Beginner L3) ===')\n"
                "    daemon_t = threading.Thread(target=background_heartbeat, daemon=True)\n"
                "    daemon_t.start()\n"
                "    current = threading.current_thread()\n"
                "    print(f'Main Thread Name  : {current.name}')\n"
                "    print(f'Daemon Thread Name: {daemon_t.name} (is_daemon: {daemon_t.daemon})')\n"
                "    print(f'Active thread count: {threading.active_count()}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Daemon Threads & Inspection", ["daemon=True Flag", "threading.current_thread()", "active_count() Metric", "Automatic Process Exit"], code
    elif category == "intermediate":
        if sub_lvl == "1":
            code = (
                "import threading\n\n"
                "class SafeCounter:\n"
                "    def __init__(self):\n"
                "        self.value = 0\n"
                "        self.lock = threading.Lock()\n"
                "    def increment(self):\n"
                "        with self.lock:\n"
                "            self.value += 1\n\n"
                "def worker(counter: SafeCounter, iterations: int):\n"
                "    for _ in range(iterations):\n"
                "        counter.increment()\n\n"
                "def main():\n"
                "    print('=== Mutual Exclusion with threading.Lock (Intermediate L1) ===')\n"
                "    counter = SafeCounter()\n"
                "    threads = [threading.Thread(target=worker, args=(counter, 1000)) for _ in range(5)]\n"
                "    for t in threads: t.start()\n"
                "    for t in threads: t.join()\n"
                "    print(f'Final Counter Value (expected 5000): {counter.value}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Mutual Exclusion Lock", ["threading.Lock Initialization", "with self.lock Context Guard", "Race Condition Elimination", "Coordinated Invariant"], code
        elif sub_lvl == "2":
            code = (
                "import threading\n"
                "import time\n\n"
                "def wait_for_signal(event: threading.Event, name: str):\n"
                "    print(f'{name} waiting for signal...')\n"
                "    event.wait()\n"
                "    print(f'{name} received signal and proceeding!')\n\n"
                "def main():\n"
                "    print('=== Thread Signaling with threading.Event (Intermediate L2) ===')\n"
                "    start_signal = threading.Event()\n"
                "    t1 = threading.Thread(target=wait_for_signal, args=(start_signal, 'Service-A'))\n"
                "    t2 = threading.Thread(target=wait_for_signal, args=(start_signal, 'Service-B'))\n"
                "    t1.start(); t2.start()\n"
                "    time.sleep(0.01)\n"
                "    print('[MAIN] Firing broadcast signal!')\n"
                "    start_signal.set()\n"
                "    t1.join(); t2.join()\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Thread Event Signaling", ["threading.Event Flag", "event.wait() Blocking", "event.set() Broadcast", "Barrier Unblocking"], code
        else: # L3
            code = (
                "import queue\n"
                "import threading\n\n"
                "def pipeline_producer(q: queue.Queue):\n"
                "    for item in ['Packet-1', 'Packet-2', 'Packet-3']:\n"
                "        q.put(item)\n"
                "    q.put(None)  # Sentinel\n\n"
                "def pipeline_consumer(q: queue.Queue):\n"
                "    while True:\n"
                "        item = q.get()\n"
                "        if item is None: break\n"
                "        print(f'Consumed: {item}')\n"
                "        q.task_done()\n\n"
                "def main():\n"
                "    print('=== Thread-Safe Queue Pipeline (Intermediate L3) ===')\n"
                "    q = queue.Queue()\n"
                "    p = threading.Thread(target=pipeline_producer, args=(q,))\n"
                "    c = threading.Thread(target=pipeline_consumer, args=(q,))\n"
                "    c.start(); p.start()\n"
                "    p.join(); c.join()\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Queue Thread Pipeline", ["queue.Queue Integration", "Producer Put Coordination", "Consumer Get Consumption", "Sentinel Termination"], code
    else: # advanced
        if sub_lvl == "1":
            code = (
                "from concurrent.futures import ThreadPoolExecutor, as_completed\n\n"
                "def process_job(job_id: int) -> str:\n"
                "    return f'Job #{job_id} resolved with status 200'\n\n"
                "def main():\n"
                "    print('=== ThreadPoolExecutor Concurrency (Advanced L1) ===')\n"
                "    with ThreadPoolExecutor(max_workers=3) as executor:\n"
                "        futures = {executor.submit(process_job, i): i for i in range(1, 6)}\n"
                "        for f in as_completed(futures):\n"
                "            print(f.result())\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "ThreadPoolExecutor Pool", ["ThreadPoolExecutor Context", "submit() Future Spawning", "as_completed Generator", "Future Result Resolution"], code
        elif sub_lvl == "2":
            code = (
                "import queue\n"
                "import threading\n\n"
                "def bounded_producer(q: queue.Queue, count: int):\n"
                "    for i in range(count):\n"
                "        q.put(f'Frame-{i}')\n"
                "    q.put(None)\n\n"
                "def bounded_consumer(q: queue.Queue):\n"
                "    while True:\n"
                "        val = q.get()\n"
                "        if val is None: break\n"
                "        print('Processed:', val)\n\n"
                "def main():\n"
                "    print('=== Bounded Queue Producer-Consumer (Advanced L2) ===')\n"
                "    bq = queue.Queue(maxsize=2)\n"
                "    t1 = threading.Thread(target=bounded_producer, args=(bq, 4))\n"
                "    t2 = threading.Thread(target=bounded_consumer, args=(bq,))\n"
                "    t2.start(); t1.start()\n"
                "    t1.join(); t2.join()\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Bounded Queue Flow Control", ["maxsize Backpressure Control", "Blocking Put on Full", "Blocking Get on Empty", "Controlled Memory Footprint"], code
        else: # L3
            code = (
                "import threading\n\n"
                "class ConnectionPool:\n"
                "    def __init__(self, capacity: int):\n"
                "        self.sem = threading.Semaphore(capacity)\n"
                "    def execute_query(self, client_id: int):\n"
                "        with self.sem:\n"
                "            print(f'Client-{client_id} acquired DB connection from pool.')\n\n"
                "def main():\n"
                "    print('=== Semaphore Resource Pool Management (Advanced L3) ===')\n"
                "    pool = ConnectionPool(capacity=2)\n"
                "    threads = [threading.Thread(target=pool.execute_query, args=(i,)) for i in range(4)]\n"
                "    for t in threads: t.start()\n"
                "    for t in threads: t.join()\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Semaphore Resource Pool", ["threading.Semaphore Counting", "Resource Capacity Throttling", "Context Managed Release", "Concurrent Invariant"], code


# =========================================================================
# 14. RECURSION (9 GENUINELY DIFFERENT PYTHON PROGRAMS)
# =========================================================================

def get_python_recursion(category: str, sub_lvl: str) -> Tuple[str, List[str], str]:
    if category == "beginner":
        if sub_lvl == "1":
            code = (
                "def factorial(n: int) -> int:\n"
                "    if n <= 1: return 1\n"
                "    return n * factorial(n - 1)\n\n"
                "def main():\n"
                "    print('=== Recursive Factorial Calculation (Beginner L1) ===')\n"
                "    for val in [1, 3, 5, 6]:\n"
                "        print(f'{val}! = {factorial(val)}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Recursive Factorial", ["Base Case Condition", "Recursive Step (n - 1)", "Call Stack Unwinding", "Factorial Multiplication"], code
        elif sub_lvl == "2":
            code = (
                "def recursive_sum(numbers: list) -> int:\n"
                "    if not numbers: return 0\n"
                "    return numbers[0] + recursive_sum(numbers[1:])\n\n"
                "def main():\n"
                "    print('=== Recursive List Sum (Beginner L2) ===')\n"
                "    data = [10, 20, 30, 40]\n"
                "    print(f'Sum of {data} = {recursive_sum(data)}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Recursive List Sum", ["Empty List Base Case", "Head-Tail Slicing", "Additive Accumulation", "Linear Recursion Stack"], code
        else: # L3
            code = (
                "def reverse_string_rec(s: str) -> str:\n"
                "    if len(s) <= 1: return s\n"
                "    return reverse_string_rec(s[1:]) + s[0]\n\n"
                "def main():\n"
                "    print('=== Recursive String Reversal (Beginner L3) ===')\n"
                "    word = 'KnowledgeStream'\n"
                "    print('Original:', word)\n"
                "    print('Reversed:', reverse_string_rec(word))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Recursive String Reversal", ["Single Character Base Case", "Suffix Inversion", "Trailing Append Concatenation", "Call Stack Assembly"], code
    elif category == "intermediate":
        if sub_lvl == "1":
            code = (
                "import functools\n\n"
                "@functools.lru_cache(maxsize=None)\n"
                "def fibonacci_memo(n: int) -> int:\n"
                "    if n <= 0: return 0\n"
                "    if n == 1: return 1\n"
                "    return fibonacci_memo(n - 1) + fibonacci_memo(n - 2)\n\n"
                "def main():\n"
                "    print('=== Memoized Fibonacci Recursion (Intermediate L1) ===')\n"
                "    for i in range(10):\n"
                "        print(f'Fib({i}) = {fibonacci_memo(i)}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Memoized Fibonacci", ["Dual Base Cases", "lru_cache Memoization", "Tree to Linear Reduction", "O(N) Complexity"], code
        elif sub_lvl == "2":
            code = (
                "def recursive_binary_search(arr: list, target: int, low: int, high: int) -> int:\n"
                "    if low > high: return -1\n"
                "    mid = (low + high) // 2\n"
                "    if arr[mid] == target: return mid\n"
                "    elif arr[mid] > target: return recursive_binary_search(arr, target, low, mid - 1)\n"
                "    else: return recursive_binary_search(arr, target, mid + 1, high)\n\n"
                "def main():\n"
                "    print('=== Recursive Binary Search (Intermediate L2) ===')\n"
                "    nums = [10, 20, 30, 40, 50, 60, 70]\n"
                "    idx = recursive_binary_search(nums, 40, 0, len(nums) - 1)\n"
                "    print(f'Found 40 at index: {idx}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Recursive Binary Search", ["Range Inversion Base Case", "Midpoint Calculation", "Divide-and-Conquer Branching", "Logarithmic Call Tree"], code
        else: # L3
            code = (
                "def flatten_nested_list(nested: list) -> list:\n"
                "    result = []\n"
                "    for item in nested:\n"
                "        if isinstance(item, list):\n"
                "            result.extend(flatten_nested_list(item))\n"
                "        else:\n"
                "            result.append(item)\n"
                "    return result\n\n"
                "def main():\n"
                "    print('=== Flattening Arbitrary Nested Lists (Intermediate L3) ===')\n"
                "    complex_data = [1, [2, [3, 4], 5], [6, 7], 8]\n"
                "    print('Nested list :', complex_data)\n"
                "    print('Flattened   :', flatten_nested_list(complex_data))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Nested List Flattening", ["Type Introspection isinstance", "Subtree Recursive Extend", "Leaf Append Invariant", "General Tree Traversal"], code
    else: # advanced
        if sub_lvl == "1":
            code = (
                "def tower_of_hanoi(n: int, src: str, aux: str, dst: str, moves: list):\n"
                "    if n == 1:\n"
                "        moves.append(f'Move disk 1 from {src} to {dst}')\n"
                "        return\n"
                "    tower_of_hanoi(n - 1, src, dst, aux, moves)\n"
                "    moves.append(f'Move disk {n} from {src} to {dst}')\n"
                "    tower_of_hanoi(n - 1, aux, src, dst, moves)\n\n"
                "def main():\n"
                "    print('=== Tower of Hanoi Recursive Solver (Advanced L1) ===')\n"
                "    moves = []\n"
                "    tower_of_hanoi(3, 'Peg-A', 'Peg-B', 'Peg-C', moves)\n"
                "    for step, m in enumerate(moves, 1): print(f'Step {step}: {m}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Tower of Hanoi Solver", ["Inductive Hypothesis", "Source/Auxiliary Peg Exchange", "Disk Transition Sequence", "Exponential Moves Proof"], code
        elif sub_lvl == "2":
            code = (
                "def generate_permutations(elements: list) -> list:\n"
                "    if len(elements) <= 1: return [elements]\n"
                "    perms = []\n"
                "    for i in range(len(elements)):\n"
                "        curr = elements[i]\n"
                "        rem = elements[:i] + elements[i+1:]\n"
                "        for p in generate_permutations(rem):\n"
                "            perms.append([curr] + p)\n"
                "    return perms\n\n"
                "def main():\n"
                "    print('=== Backtracking Permutations Generator (Advanced L2) ===')\n"
                "    items = ['A', 'B', 'C']\n"
                "    res = generate_permutations(items)\n"
                "    print(f'Total permutations of {items} ({len(res)}):')\n"
                "    for p in res: print(' ', p)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Recursive Permutations", ["Backtracking Tree Search", "Element Selection & Remaining Slice", "Combinatorial Recursion", "Factorial Complexity"], code
        else: # L3
            code = (
                "def traverse_filesystem_tree(tree: dict, indent: int = 0):\n"
                "    for name, content in tree.items():\n"
                "        prefix = '  ' * indent + ('[DIR] ' if isinstance(content, dict) else '[FILE] ')\n"
                "        print(f'{prefix}{name}')\n"
                "        if isinstance(content, dict):\n"
                "            traverse_filesystem_tree(content, indent + 1)\n\n"
                "def main():\n"
                "    print('=== Recursive Tree Directory Traversal (Advanced L3) ===')\n"
                "    fs_mock = {\n"
                "        'src': {\n"
                "            'components': {'Navbar.py': None, 'Sidebar.py': None},\n"
                "            'utils': {'math.py': None}\n"
                "        },\n"
                "        'README.md': None\n"
                "    }\n"
                "    traverse_filesystem_tree(fs_mock)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Recursive Tree Traversal", ["Hierarchical Tree Parsing", "Indentation Depth Formatting", "Internal Node vs Leaf Node", "Arbitrary Depth Support"], code


# =========================================================================
# 15. SEARCHING (9 GENUINELY DIFFERENT PYTHON PROGRAMS)
# =========================================================================

def get_python_searching(category: str, sub_lvl: str) -> Tuple[str, List[str], str]:
    if category == "beginner":
        if sub_lvl == "1":
            code = (
                "def linear_search(arr: list, target: int) -> int:\n"
                "    for i in range(len(arr)):\n"
                "        if arr[i] == target: return i\n"
                "    return -1\n\n"
                "def main():\n"
                "    print('=== Linear Search Algorithm (Beginner L1) ===')\n"
                "    nums = [15, 42, 8, 23, 74, 16]\n"
                "    target = 23\n"
                "    idx = linear_search(nums, target)\n"
                "    print(f'Element {target} found at index: {idx}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Linear Search", ["Sequential Loop Iteration", "Equality Comparison", "Index Return on Hit", "-1 Flag on Miss"], code
        elif sub_lvl == "2":
            code = (
                "def find_occurrences(arr: list, target: int) -> tuple:\n"
                "    first = -1; last = -1\n"
                "    for idx, val in enumerate(arr):\n"
                "        if val == target:\n"
                "            if first == -1: first = idx\n"
                "            last = idx\n"
                "    return first, last\n\n"
                "def main():\n"
                "    print('=== First and Last Occurrence Search (Beginner L2) ===')\n"
                "    data = [5, 2, 8, 2, 9, 2, 4]\n"
                "    f, l = find_occurrences(data, 2)\n"
                "    print(f'For value 2: first={f}, last={l}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "First & Last Occurrence", ["Dual Pointer Boundary", "Initial Hit Capture", "Continuous Last Update", "Single Pass Scrutiny"], code
        else: # L3
            code = (
                "def sentinel_linear_search(arr: list, target: int) -> int:\n"
                "    n = len(arr)\n"
                "    last = arr[n - 1]\n"
                "    arr[n - 1] = target\n"
                "    i = 0\n"
                "    while arr[i] != target: i += 1\n"
                "    arr[n - 1] = last\n"
                "    if i < n - 1 or arr[n - 1] == target: return i\n"
                "    return -1\n\n"
                "def main():\n"
                "    print('=== Sentinel Linear Search (Beginner L3) ===')\n"
                "    items = [10, 50, 30, 70, 80, 20]\n"
                "    idx = sentinel_linear_search(items, 70)\n"
                "    print('Found 70 at index:', idx)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Sentinel Search", ["Array Tail Replacement", "Loop Boundary Check Elimination", "Sentinel Restore Invariant", "Optimized Comparison"], code
    elif category == "intermediate":
        if sub_lvl == "1":
            code = (
                "def binary_search_iterative(arr: list, target: int) -> int:\n"
                "    left = 0; right = len(arr) - 1\n"
                "    while left <= right:\n"
                "        mid = (left + right) // 2\n"
                "        if arr[mid] == target: return mid\n"
                "        elif arr[mid] < target: left = mid + 1\n"
                "        else: right = mid - 1\n"
                "    return -1\n\n"
                "def main():\n"
                "    print('=== Iterative Binary Search (Intermediate L1) ===')\n"
                "    sorted_nums = [3, 8, 14, 21, 29, 37, 45, 53]\n"
                "    idx = binary_search_iterative(sorted_nums, 29)\n"
                "    print('29 found at index:', idx)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Iterative Binary Search", ["Sorted Array Prerequisite", "Left/Right Boundary Shift", "Midpoint Calculation", "O(log N) Convergence"], code
        elif sub_lvl == "2":
            code = (
                "def lower_bound(arr: list, target: int) -> int:\n"
                "    l = 0; r = len(arr)\n"
                "    while l < r:\n"
                "        mid = (l + r) // 2\n"
                "        if arr[mid] < target: l = mid + 1\n"
                "        else: r = mid\n"
                "    return l\n\n"
                "def main():\n"
                "    print('=== Binary Search Lower Bound Insertion (Intermediate L2) ===')\n"
                "    arr = [10, 20, 20, 20, 30, 40]\n"
                "    idx = lower_bound(arr, 20)\n"
                "    print('First position >= 20 is index:', idx)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Lower Bound Search", ["Half-Open Range [l, r)", "Invariant Preservation", "Smallest Index >= Target", "Bisect Mechanics"], code
        else: # L3
            code = (
                "def search_rotated_array(nums: list, target: int) -> int:\n"
                "    l = 0; r = len(nums) - 1\n"
                "    while l <= r:\n"
                "        mid = (l + r) // 2\n"
                "        if nums[mid] == target: return mid\n"
                "        if nums[l] <= nums[mid]:\n"
                "            if nums[l] <= target < nums[mid]: r = mid - 1\n"
                "            else: l = mid + 1\n"
                "        else:\n"
                "            if nums[mid] < target <= nums[r]: l = mid + 1\n"
                "            else: r = mid - 1\n"
                "    return -1\n\n"
                "def main():\n"
                "    print('=== Search in Rotated Sorted Array (Intermediate L3) ===')\n"
                "    nums = [4, 5, 6, 7, 0, 1, 2]\n"
                "    target = 0\n"
                "    print(f'Target {target} index:', search_rotated_array(nums, target))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Rotated Sorted Search", ["Sorted Half Detection", "Target Range Invariant", "Boundary Contraction", "O(log N) Time"], code
    else: # advanced
        if sub_lvl == "1":
            code = (
                "def exponential_search(arr: list, target: int) -> int:\n"
                "    if arr[0] == target: return 0\n"
                "    i = 1; n = len(arr)\n"
                "    while i < n and arr[i] <= target: i *= 2\n"
                "    l, r = i // 2, min(i, n - 1)\n"
                "    while l <= r:\n"
                "        mid = (l + r) // 2\n"
                "        if arr[mid] == target: return mid\n"
                "        elif arr[mid] < target: l = mid + 1\n"
                "        else: r = mid - 1\n"
                "    return -1\n\n"
                "def main():\n"
                "    print('=== Exponential Search Algorithm (Advanced L1) ===')\n"
                "    arr = [2, 3, 4, 10, 40, 55, 70, 85, 90, 100]\n"
                "    print('Index of 85:', exponential_search(arr, 85))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Exponential Search", ["Doubling Step Growth", "Range Bounding", "Sub-Array Binary Search", "Unbounded List Applicability"], code
        elif sub_lvl == "2":
            code = (
                "def find_peak_element(nums: list) -> int:\n"
                "    l = 0; r = len(nums) - 1\n"
                "    while l < r:\n"
                "        mid = (l + r) // 2\n"
                "        if nums[mid] > nums[mid + 1]: r = mid\n"
                "        else: l = mid + 1\n"
                "    return l\n\n"
                "def main():\n"
                "    print('=== Peak Element Search via Binary Search (Advanced L2) ===')\n"
                "    elevation = [1, 2, 1, 3, 5, 6, 4]\n"
                "    peak_idx = find_peak_element(elevation)\n"
                "    print(f'Peak element found at index {peak_idx}: val={elevation[peak_idx]}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Peak Element Search", ["Slope Direction Check", "Binary Search on Answer", "O(log N) Guarantee", "Local Maximum Convergence"], code
        else: # L3
            code = (
                "def quickselect(arr: list, k: int) -> int:\n"
                "    pivot = arr[len(arr) // 2]\n"
                "    lows = [x for x in arr if x < pivot]\n"
                "    highs = [x for x in arr if x > pivot]\n"
                "    pivots = [x for x in arr if x == pivot]\n"
                "    if k < len(lows): return quickselect(lows, k)\n"
                "    elif k < len(lows) + len(pivots): return pivot\n"
                "    else: return quickselect(highs, k - len(lows) - len(pivots))\n\n"
                "def main():\n"
                "    print('=== Quickselect k-th Smallest Element (Advanced L3) ===')\n"
                "    nums = [7, 10, 4, 3, 20, 15]\n"
                "    k = 2\n"
                "    print('Array:', nums)\n"
                "    print(f'3rd smallest element: {quickselect(nums, k)}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Quickselect k-th Smallest", ["Pivot Partitioning", "Subproblem Size Comparison", "Tail Recursion Reduction", "O(N) Average Time"], code


# =========================================================================
# 16. SORTING (9 GENUINELY DIFFERENT PYTHON PROGRAMS)
# =========================================================================

def get_python_sorting(category: str, sub_lvl: str) -> Tuple[str, List[str], str]:
    if category == "beginner":
        if sub_lvl == "1":
            code = (
                "def bubble_sort(arr: list) -> None:\n"
                "    n = len(arr)\n"
                "    for i in range(n):\n"
                "        for j in range(0, n - i - 1):\n"
                "            if arr[j] > arr[j + 1]:\n"
                "                arr[j], arr[j + 1] = arr[j + 1], arr[j]\n\n"
                "def main():\n"
                "    print('=== Basic Bubble Sort (Beginner L1) ===')\n"
                "    nums = [64, 34, 25, 12, 22, 11, 90]\n"
                "    print('Before:', nums)\n"
                "    bubble_sort(nums)\n"
                "    print('After :', nums)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Bubble Sort", ["Nested Pass Loop", "Adjacent Element Comparison", "In-Place Swap", "Largest Element Bubbling"], code
        elif sub_lvl == "2":
            code = (
                "def optimized_bubble_sort(arr: list) -> int:\n"
                "    n = len(arr)\n"
                "    passes = 0\n"
                "    for i in range(n):\n"
                "        swapped = False\n"
                "        passes += 1\n"
                "        for j in range(0, n - i - 1):\n"
                "            if arr[j] > arr[j + 1]:\n"
                "                arr[j], arr[j + 1] = arr[j + 1], arr[j]\n"
                "                swapped = True\n"
                "        if not swapped: break\n"
                "    return passes\n\n"
                "def main():\n"
                "    print('=== Optimized Bubble Sort Early Exit (Beginner L2) ===')\n"
                "    nearly_sorted = [1, 2, 4, 3, 5, 6, 7]\n"
                "    total_passes = optimized_bubble_sort(nearly_sorted)\n"
                "    print('Sorted array :', nearly_sorted)\n"
                "    print('Passes taken :', total_passes)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Optimized Bubble Sort", ["Early Exit Flag swapped", "Early Termination on Clean Pass", "O(N) Best Case", "Pass Efficiency Metric"], code
        else: # L3
            code = (
                "def selection_sort(arr: list) -> None:\n"
                "    n = len(arr)\n"
                "    for i in range(n):\n"
                "        min_idx = i\n"
                "        for j in range(i + 1, n):\n"
                "            if arr[j] < arr[min_idx]:\n"
                "                min_idx = j\n"
                "        arr[i], arr[min_idx] = arr[min_idx], arr[i]\n\n"
                "def main():\n"
                "    print('=== Selection Sort Algorithm (Beginner L3) ===')\n"
                "    items = [29, 10, 14, 37, 13]\n"
                "    selection_sort(items)\n"
                "    print('Selection sorted:', items)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Selection Sort", ["Minimum Index Tracking", "Unsorted Suffix Scan", "Single Swap Per Pass", "Deterministic O(N^2)"], code
    elif category == "intermediate":
        if sub_lvl == "1":
            code = (
                "def insertion_sort(arr: list) -> None:\n"
                "    for i in range(1, len(arr)):\n"
                "        key = arr[i]\n"
                "        j = i - 1\n"
                "        while j >= 0 and arr[j] > key:\n"
                "            arr[j + 1] = arr[j]\n"
                "            j -= 1\n"
                "        arr[j + 1] = key\n\n"
                "def main():\n"
                "    print('=== Insertion Sort Algorithm (Intermediate L1) ===')\n"
                "    nums = [12, 11, 13, 5, 6]\n"
                "    insertion_sort(nums)\n"
                "    print('Insertion sorted:', nums)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Insertion Sort", ["Key Element Extraction", "Right Shifting in Subarray", "Key Placement", "Adaptive Online Behavior"], code
        elif sub_lvl == "2":
            code = (
                "def merge_sort(arr: list) -> list:\n"
                "    if len(arr) <= 1: return arr\n"
                "    mid = len(arr) // 2\n"
                "    left = merge_sort(arr[:mid])\n"
                "    right = merge_sort(arr[mid:])\n"
                "    res = []; i = j = 0\n"
                "    while i < len(left) and j < len(right):\n"
                "        if left[i] <= right[j]: res.append(left[i]); i += 1\n"
                "        else: res.append(right[j]); j += 1\n"
                "    res.extend(left[i:]); res.extend(right[j:])\n"
                "    return res\n\n"
                "def main():\n"
                "    print('=== Merge Sort Divide and Conquer (Intermediate L2) ===')\n"
                "    nums = [38, 27, 43, 3, 9, 82, 10]\n"
                "    print('Merge sorted:', merge_sort(nums))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Merge Sort", ["Divide Step via Halving", "Conquer Recursive Call", "Two-Finger Linear Merge", "Guaranteed O(N log N)"], code
        else: # L3
            code = (
                "def quick_sort(arr: list) -> list:\n"
                "    if len(arr) <= 1: return arr\n"
                "    pivot = arr[len(arr) // 2]\n"
                "    left = [x for x in arr if x < pivot]\n"
                "    middle = [x for x in arr if x == pivot]\n"
                "    right = [x for x in arr if x > pivot]\n"
                "    return quick_sort(left) + middle + quick_sort(right)\n\n"
                "def main():\n"
                "    print('=== Quick Sort with Middle Pivot (Intermediate L3) ===')\n"
                "    nums = [10, 7, 8, 9, 1, 5]\n"
                "    print('Quick sorted:', quick_sort(nums))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Quick Sort", ["Pivot Partitioning", "Three-Way List Partition", "Recursive Subarray Assembly", "Concatenation Invariant"], code
    else: # advanced
        if sub_lvl == "1":
            code = (
                "def in_place_quicksort_3way(arr: list, low: int, high: int):\n"
                "    if low >= high: return\n"
                "    lt = low; gt = high\n"
                "    pivot = arr[low]\n"
                "    i = low + 1\n"
                "    while i <= gt:\n"
                "        if arr[i] < pivot:\n"
                "            arr[lt], arr[i] = arr[i], arr[lt]\n"
                "            lt += 1; i += 1\n"
                "        elif arr[i] > pivot:\n"
                "            arr[i], arr[gt] = arr[gt], arr[i]\n"
                "            gt -= 1\n"
                "        else: i += 1\n"
                "    in_place_quicksort_3way(arr, low, lt - 1)\n"
                "    in_place_quicksort_3way(arr, gt + 1, high)\n\n"
                "def main():\n"
                "    print('=== In-Place 3-Way QuickSort Dutch National Flag (Advanced L1) ===')\n"
                "    nums = [4, 2, 4, 3, 4, 1, 4, 5]\n"
                "    in_place_quicksort_3way(nums, 0, len(nums) - 1)\n"
                "    print('3-Way QuickSorted:', nums)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "3-Way In-Place QuickSort", ["Dutch National Flag Pivot", "Duplicate Handling Optimization", "lt and gt Bounds Tracking", "O(1) Auxiliary Memory"], code
        elif sub_lvl == "2":
            code = (
                "def heapify(arr: list, n: int, i: int):\n"
                "    largest = i\n"
                "    l = 2 * i + 1; r = 2 * i + 2\n"
                "    if l < n and arr[l] > arr[largest]: largest = l\n"
                "    if r < n and arr[r] > arr[largest]: largest = r\n"
                "    if largest != i:\n"
                "        arr[i], arr[largest] = arr[largest], arr[i]\n"
                "        heapify(arr, n, largest)\n\n"
                "def heap_sort(arr: list):\n"
                "    n = len(arr)\n"
                "    for i in range(n // 2 - 1, -1, -1): heapify(arr, n, i)\n"
                "    for i in range(n - 1, 0, -1):\n"
                "        arr[i], arr[0] = arr[0], arr[i]\n"
                "        heapify(arr, i, 0)\n\n"
                "def main():\n"
                "    print('=== Heap Sort Max-Heap Construction (Advanced L2) ===')\n"
                "    data = [12, 11, 13, 5, 6, 7]\n"
                "    heap_sort(data)\n"
                "    print('Heap sorted:', data)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Heap Sort Max-Heap", ["Max-Heap Tree Property", "Sift-Down Heapify", "In-Place Root Extraction", "O(N log N) Worst-Case Bound"], code
        else: # L3
            code = (
                "from functools import cmp_to_key\n\n"
                "def compare_versions(v1: str, v2: str) -> int:\n"
                "    p1 = [int(x) for x in v1.split('.')]\n"
                "    p2 = [int(x) for x in v2.split('.')]\n"
                "    for a, b in zip(p1, p2):\n"
                "        if a != b: return -1 if a < b else 1\n"
                "    return -1 if len(p1) < len(p2) else (1 if len(p1) > len(p2) else 0)\n\n"
                "def main():\n"
                "    print('=== Custom Multi-Criteria Comparator Sorting (Advanced L3) ===')\n"
                "    versions = ['1.10.2', '1.2.0', '2.0.1', '1.2.10', '1.2']\n"
                "    sorted_versions = sorted(versions, key=cmp_to_key(compare_versions))\n"
                "    print('Semantic Version Sorted:', sorted_versions)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Semantic Version Comparator", ["cmp_to_key Wrapper", "Custom Three-Way Comparator", "Major.Minor.Patch Decomposition", "TimSort Stability"], code


# =========================================================================
# 17. DATABASE / SQLITE (9 GENUINELY DIFFERENT PYTHON PROGRAMS)
# =========================================================================

def get_python_database(category: str, sub_lvl: str) -> Tuple[str, List[str], str]:
    if category == "beginner":
        if sub_lvl == "1":
            code = (
                "import sqlite3\n\n"
                "def main():\n"
                "    print('=== In-Memory SQLite Table Creation and Insert (Beginner L1) ===')\n"
                "    conn = sqlite3.connect(':memory:')\n"
                "    cursor = conn.cursor()\n"
                "    cursor.execute('CREATE TABLE courses (id INTEGER PRIMARY KEY, title TEXT, credits INTEGER)')\n"
                "    cursor.execute('INSERT INTO courses VALUES (1, \\'Python Foundations\\', 3)')\n"
                "    conn.commit()\n"
                "    print('Table created and 1 record inserted successfully.')\n"
                "    conn.close()\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "SQLite Connection & Insert", ["sqlite3 :memory: DB", "CREATE TABLE DDL", "INSERT DML Statement", "Connection Commit & Close"], code
        elif sub_lvl == "2":
            code = (
                "import sqlite3\n\n"
                "def main():\n"
                "    print('=== Querying Rows with fetchall (Beginner L2) ===')\n"
                "    conn = sqlite3.connect(':memory:')\n"
                "    cur = conn.cursor()\n"
                "    cur.execute('CREATE TABLE users (name TEXT, age INTEGER)')\n"
                "    cur.executemany('INSERT INTO users VALUES (?, ?)', [('Alice', 24), ('Bob', 30), ('Charlie', 22)])\n"
                "    conn.commit()\n"
                "    cur.execute('SELECT name, age FROM users WHERE age >= 24')\n"
                "    rows = cur.fetchall()\n"
                "    for name, age in rows: print(f'User: {name}, Age: {age}')\n"
                "    conn.close()\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Querying with fetchall", ["executemany Batch Insert", "SELECT WHERE Filter", "fetchall() Row Retrieval", "Tuple Result Iteration"], code
        else: # L3
            code = (
                "import sqlite3\n\n"
                "def get_user_by_name(cursor, username: str):\n"
                "    cursor.execute('SELECT id, role FROM accounts WHERE username = ?', (username,))\n"
                "    return cursor.fetchone()\n\n"
                "def main():\n"
                "    print('=== Parameterized Queries Preventing SQLi (Beginner L3) ===')\n"
                "    conn = sqlite3.connect(':memory:')\n"
                "    cur = conn.cursor()\n"
                "    cur.execute('CREATE TABLE accounts (id INTEGER PRIMARY KEY, username TEXT, role TEXT)')\n"
                "    cur.execute('INSERT INTO accounts VALUES (1, \\'admin\\', \\'superuser\\')')\n"
                "    record = get_user_by_name(cur, 'admin')\n"
                "    print('Found record:', record)\n"
                "    conn.close()\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Parameterized Queries", ["Placeholder (?) Binding", "SQL Injection Immunity", "fetchone() Lookup", "Database Contract"], code
    elif category == "intermediate":
        if sub_lvl == "1":
            code = (
                "import sqlite3\n\n"
                "def main():\n"
                "    print('=== Full CRUD Operations (Intermediate L1) ===')\n"
                "    conn = sqlite3.connect(':memory:')\n"
                "    c = conn.cursor()\n"
                "    c.execute('CREATE TABLE items (id INTEGER, name TEXT, price REAL)')\n"
                "    c.execute('INSERT INTO items VALUES (1, \\'Laptop\\', 1200.0)')\n"
                "    c.execute('SELECT * FROM items WHERE id = 1'); print('Read   :', c.fetchone())\n"
                "    c.execute('UPDATE items SET price = 1100.0 WHERE id = 1')\n"
                "    c.execute('SELECT price FROM items WHERE id = 1'); print('Updated:', c.fetchone())\n"
                "    c.execute('DELETE FROM items WHERE id = 1')\n"
                "    c.execute('SELECT COUNT(*) FROM items'); print('Count  :', c.fetchone()[0])\n"
                "    conn.close()\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Full CRUD Operations", ["Create (INSERT)", "Read (SELECT)", "Update (UPDATE SET)", "Delete (DELETE FROM)"], code
        elif sub_lvl == "2":
            code = (
                "import sqlite3\n\n"
                "def main():\n"
                "    print('=== Aggregate Queries and Row Factory (Intermediate L2) ===')\n"
                "    conn = sqlite3.connect(':memory:')\n"
                "    conn.row_factory = sqlite3.Row\n"
                "    cur = conn.cursor()\n"
                "    cur.execute('CREATE TABLE sales (region TEXT, amount REAL)')\n"
                "    cur.executemany('INSERT INTO sales VALUES (?, ?)', [\n"
                "        ('East', 500), ('East', 700), ('West', 400), ('West', 600)\n"
                "    ])\n"
                "    cur.execute('SELECT region, AVG(amount) as avg_sale, COUNT(*) as cnt FROM sales GROUP BY region')\n"
                "    for row in cur.fetchall():\n"
                "        print(f'Region {row[\"region\"]}: Avg=${row[\"avg_sale\"]:.2f} ({row[\"cnt\"]} orders)')\n"
                "    conn.close()\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Aggregate Queries & RowFactory", ["sqlite3.Row Factory", "GROUP BY Aggregations", "AVG() and COUNT()", "Key-Based Column Access"], code
        else: # L3
            code = (
                "import sqlite3\n\n"
                "def main():\n"
                "    print('=== Relational Joins between Entities (Intermediate L3) ===')\n"
                "    conn = sqlite3.connect(':memory:')\n"
                "    cur = conn.cursor()\n"
                "    cur.execute('CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT)')\n"
                "    cur.execute('CREATE TABLE books (id INTEGER, author_id INTEGER, title TEXT)')\n"
                "    cur.execute('INSERT INTO authors VALUES (1, \\'George Orwell\\')')\n"
                "    cur.execute('INSERT INTO books VALUES (101, 1, \\'1984\\')')\n"
                "    cur.execute('INSERT INTO books VALUES (102, 1, \\'Animal Farm\\')')\n"
                "    cur.execute('SELECT authors.name, books.title FROM authors JOIN books ON authors.id = books.author_id')\n"
                "    for author, title in cur.fetchall(): print(f'{author} wrote \\'{title}\\'')\n"
                "    conn.close()\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Relational Table Joins", ["Foreign Key author_id", "INNER JOIN ON Syntax", "Relational Mapping", "Tabular Projection"], code
    else: # advanced
        if sub_lvl == "1":
            code = (
                "import sqlite3\n\n"
                "def transfer_funds(conn, from_acc: int, to_acc: int, amount: float):\n"
                "    try:\n"
                "        with conn:\n"
                "            cur = conn.cursor()\n"
                "            cur.execute('UPDATE accounts SET bal = bal - ? WHERE id = ?', (amount, from_acc))\n"
                "            cur.execute('UPDATE accounts SET bal = bal + ? WHERE id = ?', (amount, to_acc))\n"
                "            print(f'Transferred ${amount} from #{from_acc} to #{to_acc}')\n"
                "    except Exception as e:\n"
                "        print(f'Transaction rolled back: {e}')\n\n"
                "def main():\n"
                "    print('=== Transaction Management and Atomic Rollback (Advanced L1) ===')\n"
                "    conn = sqlite3.connect(':memory:')\n"
                "    conn.execute('CREATE TABLE accounts (id INT PRIMARY KEY, bal REAL)')\n"
                "    conn.execute('INSERT INTO accounts VALUES (1, 1000), (2, 500)')\n"
                "    transfer_funds(conn, 1, 2, 200.0)\n"
                "    print('Balances:', conn.execute('SELECT * FROM accounts').fetchall())\n"
                "    conn.close()\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Transaction Management", ["with conn Transaction Context", "Atomic Double-Entry Bookkeeping", "Automatic Rollback on Exception", "ACID Invariant"], code
        elif sub_lvl == "2":
            code = (
                "import sqlite3\n\n"
                "class DatabaseManager:\n"
                "    def __init__(self, db_path=':memory:'): self.db_path = db_path\n"
                "    def __enter__(self):\n"
                "        self.conn = sqlite3.connect(self.db_path)\n"
                "        return self.conn\n"
                "    def __exit__(self, exc_type, exc_val, exc_tb):\n"
                "        if self.conn: self.conn.close()\n\n"
                "def main():\n"
                "    print('=== Database Connection Manager Pattern (Advanced L2) ===')\n"
                "    with DatabaseManager() as conn:\n"
                "        conn.execute('CREATE TABLE test (v TEXT)')\n"
                "        conn.execute('INSERT INTO test VALUES (\\'active\\')')\n"
                "        print('Record:', conn.execute('SELECT * FROM test').fetchone()[0])\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Connection Manager Pattern", ["Custom Context Manager", "Automatic Disconnect Guarantee", "Clean Resource Scoping", "Connection Lifecycle"], code
        else: # L3
            code = (
                "import sqlite3\n\n"
                "class UserRepository:\n"
                "    def __init__(self, conn): self.conn = conn\n"
                "    def save(self, user_id: int, name: str):\n"
                "        with self.conn:\n"
                "            self.conn.execute('INSERT OR REPLACE INTO users VALUES (?, ?)', (user_id, name))\n"
                "    def find_by_id(self, user_id: int):\n"
                "        cur = self.conn.execute('SELECT name FROM users WHERE id = ?', (user_id,))\n"
                "        row = cur.fetchone()\n"
                "        return row[0] if row else None\n\n"
                "def main():\n"
                "    print('=== Repository Pattern Database Abstraction (Advanced L3) ===')\n"
                "    conn = sqlite3.connect(':memory:')\n"
                "    conn.execute('CREATE TABLE users (id INT PRIMARY KEY, name TEXT)')\n"
                "    repo = UserRepository(conn)\n"
                "    repo.save(1, 'Naveen')\n"
                "    print('Retrieved User #1:', repo.find_by_id(1))\n"
                "    conn.close()\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Repository Pattern", ["Persistence Decoupling", "save Domain Abstraction", "find_by_id Entity Lookup", "Clean Architecture Pattern"], code


# =========================================================================
# 18. API / HTTP CLIENT (9 GENUINELY DIFFERENT PYTHON PROGRAMS)
# =========================================================================

def get_python_api(category: str, sub_lvl: str) -> Tuple[str, List[str], str]:
    if category == "beginner":
        if sub_lvl == "1":
            code = (
                "import json\n\n"
                "def mock_fetch_api_data(endpoint: str) -> dict:\n"
                "    raw_json = '{\"status\": \"ok\", \"userId\": 101, \"role\": \"student\"}'\n"
                "    return json.loads(raw_json)\n\n"
                "def main():\n"
                "    print('=== Mock HTTP GET and JSON Parsing (Beginner L1) ===')\n"
                "    response = mock_fetch_api_data('/api/v1/user')\n"
                "    print('API Response Status:', response['status'])\n"
                "    print('User Role          :', response['role'])\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Mock HTTP GET", ["Endpoint Simulation", "JSON Response Decoding", "Key Projection", "Payload Verification"], code
        elif sub_lvl == "2":
            code = (
                "from urllib.parse import urlencode\n\n"
                "def build_request_url(base: str, params: dict) -> str:\n"
                "    query_string = urlencode(params)\n"
                "    return f'{base}?{query_string}'\n\n"
                "def main():\n"
                "    print('=== Query Parameter URL Builder (Beginner L2) ===')\n"
                "    params = {'topic': 'Python', 'level': 'Beginner', 'limit': 10}\n"
                "    url = build_request_url('https://api.knowledgestream.ai/lessons', params)\n"
                "    print('Formatted URL:', url)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Query URL Builder", ["urllib.parse.urlencode", "URL Parameter Escaping", "Query String Assembly", "Clean HTTP Request Path"], code
        else: # L3
            code = (
                "def handle_status_code(code: int) -> str:\n"
                "    if 200 <= code < 300: return f'{code} Success: OK'\n"
                "    elif code == 400: return '400 Client Error: Bad Request'\n"
                "    elif code == 401: return '401 Client Error: Unauthorized'\n"
                "    elif code == 404: return '404 Client Error: Not Found'\n"
                "    elif code >= 500: return f'{code} Server Error'\n"
                "    return f'{code} Unknown'\n\n"
                "def main():\n"
                "    print('=== HTTP Status Code Validation (Beginner L3) ===')\n"
                "    for status in [200, 201, 401, 404, 502]:\n"
                "        print(handle_status_code(status))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Status Code Validation", ["HTTP Protocol Semantics", "2xx Success Handling", "4xx Client Error Identification", "5xx Server Error Resolution"], code
    elif category == "intermediate":
        if sub_lvl == "1":
            code = (
                "import json\n\n"
                "class MockRestClient:\n"
                "    def __init__(self, base_url: str): self.base_url = base_url\n"
                "    def get(self, path: str):\n"
                "        return {'status': 200, 'path': f'{self.base_url}{path}', 'data': ['Item-A', 'Item-B']}\n"
                "    def post(self, path: str, payload: dict):\n"
                "        return {'status': 201, 'path': f'{self.base_url}{path}', 'created': payload}\n\n"
                "def main():\n"
                "    print('=== REST Client Simulator (Intermediate L1) ===')\n"
                "    client = MockRestClient('https://api.codenthra.io')\n"
                "    print('GET response :', client.get('/v1/items'))\n"
                "    print('POST response:', client.post('/v1/items', {'name': 'New Course'}))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "REST Client Simulator", ["Base URL Construction", "HTTP GET Method", "HTTP POST with Payload", "Resource Lifecycle Responses"], code
        elif sub_lvl == "2":
            code = (
                "class AuthenticatedApiClient:\n"
                "    def __init__(self, api_token: str): self.token = api_token\n"
                "    def get_headers(self) -> dict:\n"
                "        return {\n"
                "            'Authorization': f'Bearer {self.token}',\n"
                "            'Content-Type': 'application/json',\n"
                "            'User-Agent': 'KnowledgeStream-AI-Client/8.0'\n"
                "        }\n\n"
                "def main():\n"
                "    print('=== Header Management and Bearer Token Auth (Intermediate L2) ===')\n"
                "    client = AuthenticatedApiClient('eyJh...secret_jwt')\n"
                "    print('HTTP Headers Generated:')\n"
                "    for k, v in client.get_headers().items(): print(f'  {k}: {v}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Bearer Auth Headers", ["Authorization Header Scheme", "Bearer Token Attachment", "Content-Type Negotiation", "Standard Client Headers"], code
        else: # L3
            code = (
                "import time\n\n"
                "def api_call_with_retry(max_retries: int = 3, backoff: float = 0.05):\n"
                "    attempt = 0\n"
                "    while attempt < max_retries:\n"
                "        attempt += 1\n"
                "        try:\n"
                "            if attempt < 3: raise ConnectionError('503 Service Unavailable')\n"
                "            return {'status': 200, 'message': 'Success after retries'}\n"
                "        except ConnectionError as e:\n"
                "            print(f'Attempt {attempt} failed: {e}. Retrying in {backoff}s...')\n"
                "            time.sleep(backoff)\n"
                "            backoff *= 2\n"
                "    raise RuntimeError('Max retries exceeded')\n\n"
                "def main():\n"
                "    print('=== Exponential Backoff Retry Logic (Intermediate L3) ===')\n"
                "    res = api_call_with_retry()\n"
                "    print('Result:', res)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Exponential Backoff Retry", ["Backoff Multiplication Loop", "Connection Failure Catching", "Transient Error Recovery", "Max Retry Enforcement"], code
    else: # advanced
        if sub_lvl == "1":
            code = (
                "import time\n\n"
                "class RateLimitedClient:\n"
                "    def __init__(self, min_interval_seconds: float = 0.05):\n"
                "        self.min_interval = min_interval_seconds\n"
                "        self.last_call = 0.0\n"
                "    def call(self, endpoint: str) -> str:\n"
                "        elapsed = time.time() - self.last_call\n"
                "        if elapsed < self.min_interval:\n"
                "            time.sleep(self.min_interval - elapsed)\n"
                "        self.last_call = time.time()\n"
                "        return f'Fetched {endpoint} at {self.last_call:.4f}'\n\n"
                "def main():\n"
                "    print('=== Rate-Limited Client Throttling (Advanced L1) ===')\n"
                "    client = RateLimitedClient(0.02)\n"
                "    for i in range(3): print(client.call(f'/api/resource/{i}'))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Rate-Limited Client", ["Timestamp Difference Throttling", "time.sleep Delay Injection", "Burst Rate Prevention", "Predictable Request Cadence"], code
        elif sub_lvl == "2":
            code = (
                "import time\n\n"
                "class CachedApiClient:\n"
                "    def __init__(self, ttl: float = 1.0):\n"
                "        self.cache = {}\n"
                "        self.ttl = ttl\n"
                "    def get(self, url: str) -> str:\n"
                "        now = time.time()\n"
                "        if url in self.cache and now - self.cache[url]['time'] < self.ttl:\n"
                "            return f'[CACHE HIT] {self.cache[url][\"data\"]}'\n"
                "        data = f'Fresh Payload for {url}'\n"
                "        self.cache[url] = {'data': data, 'time': now}\n"
                "        return f'[NETWORK] {data}'\n\n"
                "def main():\n"
                "    print('=== API Response Caching Layer (Advanced L2) ===')\n"
                "    c = CachedApiClient()\n"
                "    print(c.get('/user/10'))\n"
                "    print(c.get('/user/10'))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "API Response Cache", ["Cache Hit/Miss Inspection", "TTL Expiration Comparison", "Network Traffic Conservation", "Fast Replay Response"], code
        else: # L3
            code = (
                "import hmac\n"
                "import hashlib\n\n"
                "class WebhookDispatcher:\n"
                "    def __init__(self, secret_key: str): self.secret = secret_key.encode()\n"
                "    def sign_payload(self, payload: str) -> str:\n"
                "        return hmac.new(self.secret, payload.encode(), hashlib.sha256).hexdigest()\n"
                "    def verify(self, payload: str, signature: str) -> bool:\n"
                "        expected = self.sign_payload(payload)\n"
                "        return hmac.compare_digest(expected, signature)\n\n"
                "def main():\n"
                "    print('=== Webhook Event HMAC Signature Verification (Advanced L3) ===')\n"
                "    dispatcher = WebhookDispatcher('ksai_secret_token_123')\n"
                "    body = '{\"event\": \"PAYMENT_RECEIVED\", \"amount\": 250}'\n"
                "    sig = dispatcher.sign_payload(body)\n"
                "    print('Generated HMAC Signature:', sig)\n"
                "    print('Signature verified?       :', dispatcher.verify(body, sig))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return "Webhook Signature Verification", ["hmac.new SHA-256", "hmac.compare_digest Timing Defense", "Tamper Evident Signing", "Enterprise Security Integration"], code


# =========================================================================
# 19. DYNAMIC PYTHON TOPIC SYNTHESIZER (ZERO ARITHMETIC GUARANTEE)
# =========================================================================

def synthesize_python_dynamic_program(project: str, category: str, sub_lvl: str) -> Tuple[str, List[str], str]:
    clean_topic = re.sub(r'[^a-zA-Z0-9 ]', '', project).strip().title() or 'Module'
    entity = clean_topic.replace(' ', '')

    def fill(template: str) -> str:
        return template.replace('%%TOPIC%%', clean_topic).replace('%%ENTITY%%', entity)

    if category == "beginner":
        if sub_lvl == "1":
            raw = (
                "def main():\n"
                "    print('=== %%TOPIC%% Fundamentals (Beginner L1) ===')\n"
                "    %%ENTITY_LOWER%%_records = ['Record-Alpha', 'Record-Beta', 'Record-Gamma']\n"
                "    print('Initialized %%TOPIC%% stream with:', %%ENTITY_LOWER%%_records)\n"
                "    for idx, item in enumerate(%%ENTITY_LOWER%%_records, start=1):\n"
                "        print(f'  Step {idx}: Processed {item}')\n"
                "    print('%%TOPIC%% setup completed successfully.')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return f"{clean_topic} Fundamentals", ["Initialization", "Element Iteration", "Step Execution", "Completion Output"], fill(raw).replace('%%ENTITY_LOWER%%', entity.lower())
        elif sub_lvl == "2":
            raw = (
                "def main():\n"
                "    print('=== %%TOPIC%% Inspection & Verification (Beginner L2) ===')\n"
                "    %%ENTITY_LOWER%%_state = {'active': True, 'mode': 'standard', 'count': 3}\n"
                "    print('Active status:', %%ENTITY_LOWER%%_state.get('active'))\n"
                "    if %%ENTITY_LOWER%%_state['count'] > 0:\n"
                "        print(f'Dispatched %%TOPIC%% state in {%%ENTITY_LOWER%%_state[\"mode\"]} mode.')\n"
                "    print('State verification finished.')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return f"{clean_topic} Verification", ["State Mapping", "Inspection Query", "Condition Validation", "Output Reporting"], fill(raw).replace('%%ENTITY_LOWER%%', entity.lower())
        else: # L3
            raw = (
                "def process_%%ENTITY_LOWER%%_batch(items: list) -> list:\n"
                "    processed = []\n"
                "    for it in items:\n"
                "        processed.append(f'%%ENTITY%%-OK:{it}')\n"
                "    return processed\n\n"
                "def main():\n"
                "    print('=== %%TOPIC%% Batch Workflow (Beginner L3) ===')\n"
                "    batch = ['Task-1', 'Task-2', 'Task-3']\n"
                "    results = process_%%ENTITY_LOWER%%_batch(batch)\n"
                "    print('Input batch   :', batch)\n"
                "    print('Output results:', results)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return f"{clean_topic} Workflow", ["Batch Pipeline Function", "Collection Transformation", "Result Aggregation", "Batch Output Demonstration"], fill(raw).replace('%%ENTITY_LOWER%%', entity.lower())
    elif category == "intermediate":
        if sub_lvl == "1":
            raw = (
                "class %%ENTITY%%Manager:\n"
                "    def __init__(self, name: str):\n"
                "        self.name = name\n"
                "        self._items = []\n"
                "    def add_item(self, item: str):\n"
                "        self._items.append(item)\n"
                "        print(f'[{self.name}] added: {item}')\n"
                "    def get_count(self) -> int:\n"
                "        return len(self._items)\n\n"
                "def main():\n"
                "    print('=== %%TOPIC%% Object-Oriented Manager (Intermediate L1) ===')\n"
                "    mgr = %%ENTITY%%Manager('Core%%ENTITY%%')\n"
                "    mgr.add_item('Item-01'); mgr.add_item('Item-02')\n"
                "    print(f'Total %%TOPIC%% items: {mgr.get_count()}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return f"{clean_topic} Manager", ["Class Encapsulation", "State Mutator Method", "Accessor Count Query", "Object Driver"], fill(raw)
        elif sub_lvl == "2":
            raw = (
                "def transform_%%ENTITY_LOWER%%(data: list, filter_fn) -> list:\n"
                "    return [f'PROCESSED({item})' for item in data if filter_fn(item)]\n\n"
                "def main():\n"
                "    print('=== %%TOPIC%% Transformation Pipeline (Intermediate L2) ===')\n"
                "    raw_stream = ['valid-1', 'skip-2', 'valid-3']\n"
                "    cleaned = transform_%%ENTITY_LOWER%%(raw_stream, lambda x: 'valid' in x)\n"
                "    print('Input stream :', raw_stream)\n"
                "    print('Filtered out :', cleaned)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return f"{clean_topic} Pipeline", ["Higher Order Filter", "Predicate Function", "List Comprehension Mapping", "Clean Stream Delivery"], fill(raw).replace('%%ENTITY_LOWER%%', entity.lower())
        else: # L3
            raw = (
                "class %%ENTITY%%Error(Exception): pass\n\n"
                "def execute_%%ENTITY_LOWER%%_contract(value: int):\n"
                "    if value < 0:\n"
                "        raise %%ENTITY%%Error(f'Contract breached in %%TOPIC%%: value {value} is negative')\n"
                "    return f'Contract validated: {value}'\n\n"
                "def main():\n"
                "    print('=== %%TOPIC%% Robust Contract Validation (Intermediate L3) ===')\n"
                "    for test_val in [10, -5]:\n"
                "        try:\n"
                "            res = execute_%%ENTITY_LOWER%%_contract(test_val)\n"
                "            print(res)\n"
                "        except %%ENTITY%%Error as e:\n"
                "            print(f'Caught expected error: {e}')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return f"{clean_topic} Contract", ["Custom Domain Exception", "Defensive Value Guard", "Exception Recovery", "Contract Enforcement"], fill(raw).replace('%%ENTITY_LOWER%%', entity.lower())
    else: # advanced
        if sub_lvl == "1":
            raw = (
                "from abc import ABC, abstractmethod\n\n"
                "class %%ENTITY%%Strategy(ABC):\n"
                "    @abstractmethod\n"
                "    def process(self, payload: str) -> str: pass\n\n"
                "class Fast%%ENTITY%%Strategy(%%ENTITY%%Strategy):\n"
                "    def process(self, payload: str) -> str:\n"
                "        return f'[FAST] Executed {payload} on %%TOPIC%%'\n\n"
                "class Robust%%ENTITY%%Strategy(%%ENTITY%%Strategy):\n"
                "    def process(self, payload: str) -> str:\n"
                "        return f'[ROBUST] Audited and committed {payload}'\n\n"
                "def main():\n"
                "    print('=== %%TOPIC%% Strategy Pattern (Advanced L1) ===')\n"
                "    strat: %%ENTITY%%Strategy = Robust%%ENTITY%%Strategy()\n"
                "    print(strat.process('Payload-Alpha'))\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return f"{clean_topic} Strategy Pattern", ["Strategy Interface", "Concrete Execution Algorithms", "Decoupled Polymorphism", "Modular Resolution"], fill(raw)
        elif sub_lvl == "2":
            raw = (
                "import time\n"
                "from contextlib import contextmanager\n\n"
                "@contextmanager\n"
                "def %%ENTITY_LOWER%%_telemetry_tracker():\n"
                "    t0 = time.perf_counter()\n"
                "    yield\n"
                "    t1 = time.perf_counter()\n"
                "    print(f'[TELEMETRY] %%TOPIC%% operation completed in {(t1 - t0)*1000:.4f} ms')\n\n"
                "def main():\n"
                "    print('=== %%TOPIC%% Telemetry Optimization (Advanced L2) ===')\n"
                "    with %%ENTITY_LOWER%%_telemetry_tracker():\n"
                "        data = [x ** 2 for x in range(1000)]\n"
                "    print(f'Computed {len(data)} transformed records.')\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return f"{clean_topic} Telemetry", ["Contextlib Telemetry Generator", "Performance Benchmark Hook", "Transient Resource Yield", "Optimized Pipeline"], fill(raw).replace('%%ENTITY_LOWER%%', entity.lower())
        else: # L3
            raw = (
                "class %%ENTITY%%AuditService:\n"
                "    _log = []\n"
                "    @classmethod\n"
                "    def record_transaction(cls, tx_id: str, op: str):\n"
                "        cls._log.append((tx_id, op))\n"
                "        print(f'[ENTERPRISE AUDIT] Committed tx #{tx_id} on %%TOPIC%%: {op}')\n\n"
                "class Enterprise%%ENTITY%%Pipeline:\n"
                "    def __init__(self, name: str):\n"
                "        self.name = name\n"
                "    def run(self, payload: str):\n"
                "        %%ENTITY%%AuditService.record_transaction('TX-9842', f'Execute {self.name}')\n"
                "        return f'Enterprise result for {payload}'\n\n"
                "def main():\n"
                "    print('=== Enterprise Multi-Class Architecture (Advanced L3) ===')\n"
                "    pipeline = Enterprise%%ENTITY%%Pipeline('ProductionCluster')\n"
                "    res = pipeline.run('Dataset-A')\n"
                "    print('Result:', res)\n\n"
                "if __name__ == '__main__':\n"
                "    main()\n"
            )
            return f"{clean_topic} Enterprise Architecture", ["Audit Enterprise Service", "Transaction Ledger", "Pipeline Abstraction", "Enterprise Telemetry Resolution"], fill(raw)


# =========================================================================
# 20. MAIN PYTHON DISPATCHER
# =========================================================================

def get_python_dictator_program(project: str, category: str, sub_lvl: str) -> Dict[str, Any]:
    task = normalize_python_topic(project)
    cat = (category or "beginner").lower()
    sub = str(sub_lvl or "1")

    dispatch_map = {
        "stack": get_python_stack,
        "queue": get_python_queue,
        "list": get_python_list,
        "loop": get_python_loop,
        "function": get_python_function,
        "oop": get_python_oop,
        "linked_list": get_python_linked_list,
        "dictionary": get_python_dictionary,
        "tuple": get_python_tuple,
        "set": get_python_set,
        "file_handling": get_python_file_handling,
        "exception_handling": get_python_exception_handling,
        "multithreading": get_python_multithreading,
        "recursion": get_python_recursion,
        "searching": get_python_searching,
        "sorting": get_python_sorting,
        "database": get_python_database,
        "api": get_python_api,
    }

    if task in dispatch_map:
        title, reqs, code = dispatch_map[task](cat, sub)
    else:
        title, reqs, code = synthesize_python_dynamic_program(project, cat, sub)

    # Build plan dictionary
    return {
        "lang_name": "Python",
        "requirements": reqs,
        "steps": [{
            "token": reqs[0] if reqs else "def main():",
            "insert": code,
            "title": f"Python {project} - {title}",
            "instruction": f"Implement {cat.capitalize()} Level {sub} {project} program.",
            "explanation": f"Teaches {title} with authentic Python architecture.",
            "why": f"Key learning objective for {project} at {cat.capitalize()} Level {sub}.",
            "type": "structure"
        }],
        "files": [{"name": "main.py", "content": code}]
    }
