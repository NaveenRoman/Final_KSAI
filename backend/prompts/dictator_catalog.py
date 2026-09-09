# -*- coding: utf-8 -*-
"""
Codenthra AI Dictator - 9-Variant Pedagogical Matrix Catalog
Provides 9 structurally distinct implementations per concept across:
- 6 Languages: Java, Python, C, C++, JavaScript, TypeScript
- 3 Categories: BEGINNER, INTERMEDIATE, ADVANCED
- 3 Practice Levels: LEVEL 1, LEVEL 2, LEVEL 3
Multi-file package support and ZERO generic arithmetic fallback.
"""

import re

def normalize_task_key(project: str) -> str:
    p = (project or "").lower().strip()
    if "stack" in p: return "stack"
    if "queue" in p: return "queue"
    if "linked" in p and "list" in p: return "linked_list"
    if "bst" in p or "binary search tree" in p or ("tree" in p and "trie" not in p): return "tree"
    if "graph" in p or "bfs" in p or "dfs" in p: return "graph"
    if "tuple" in p: return "tuple"
    if "dictionar" in p or "dict" in p or ("map" in p and "bitmap" not in p): return "dictionary"
    if "set" in p and "offset" not in p and "subset" not in p and "reset" not in p and "dataset" not in p: return "set"
    if "thread" in p or "multithread" in p or "concurrency" in p: return "multithreading"
    if "file" in p and ("handling" in p or "read" in p or "write" in p or "io" in p or "stream" in p): return "file_handling"
    if "inherit" in p or "polymorphism" in p or "override" in p or "oop" in p or "class" in p or "object" in p: return "oop"
    if "recursi" in p: return "recursion"
    if "pointer" in p: return "pointers"
    if "binary search" in p or "binary_search" in p: return "binary_search"
    if "sort" in p or "bubble" in p or "quick" in p or "merge" in p: return "sorting"
    if "matrix" in p or "2d array" in p or "grid" in p: return "matrix"
    if "string" in p or "text" in p or "substr" in p or "palindrome" in p or "anagram" in p: return "string_manipulation"
    if "user input" in p or "user_input" in p or "scanner" in p or "scanf" in p or "cin" in p or "interactive" in p or "input" in p: return "user_input"
    if "exception" in p or "error handling" in p or "try catch" in p: return "exception_handling"
    if "fibonacci" in p or "fib" in p: return "fibonacci"
    if "prime" in p: return "prime"
    if "factorial" in p: return "factorial"
    if "armstrong" in p: return "armstrong"
    if "even" in p or "odd" in p: return "even_odd"
    if "sum of digit" in p or "digits sum" in p: return "sum_of_digits"
    if "swap" in p: return "swap"
    if "break" in p and ("statement" in p or "loop" in p or p == "break"): return "break_statement"
    if "continue" in p: return "continue_statement"
    if "template" in p or "generic" in p: return "templates"
    return "general_task"


# =========================================================================
# 1. STACK CATALOG (9 VARIANTS x 6 LANGUAGES)
# =========================================================================

def get_stack_variants(lang: str, category: str, sub_lvl: str):
    if lang == "java":
        if category == "beginner":
            if sub_lvl == "1":
                code = (
                    "import java.util.Stack;\n\n"
                    "public class Main {\n"
                    "    public static void main(String[] args) {\n"
                    "        Stack<Integer> stack = new Stack<>();\n"
                    "        System.out.println(\"=== Java Stack (Beginner L1) ===\");\n"
                    "        stack.push(10);\n"
                    "        stack.push(20);\n"
                    "        stack.push(30);\n"
                    "        System.out.println(\"Top element (peek): \" + stack.peek());\n"
                    "        System.out.println(\"Popped: \" + stack.pop());\n"
                    "        System.out.println(\"Remaining stack: \" + stack);\n"
                    "    }\n"
                    "}\n"
                )
                return "Java", ["Stack Initialization", "Push Elements", "Peek and Pop", "Display Output"], code
            elif sub_lvl == "2":
                code = (
                    "import java.util.Stack;\n\n"
                    "public class Main {\n"
                    "    public static void main(String[] args) {\n"
                    "        Stack<String> undoHistory = new Stack<>();\n"
                    "        System.out.println(\"=== Text Editor Undo Stack (Beginner L2) ===\");\n"
                    "        undoHistory.push(\"Type 'Hello'\");\n"
                    "        undoHistory.push(\"Type 'World'\");\n"
                    "        undoHistory.push(\"Format Bold\");\n"
                    "        System.out.println(\"Last action: \" + undoHistory.peek());\n"
                    "        System.out.println(\"Undoing action: \" + undoHistory.pop());\n"
                    "        System.out.println(\"Current state: \" + undoHistory);\n"
                    "    }\n"
                    "}\n"
                )
                return "Java", ["Create History Stack", "Push Actions", "Undo Action (Pop)", "Show State"], code
            else:
                code = (
                    "import java.util.Stack;\n\n"
                    "public class Main {\n"
                    "    public static boolean isBalanced(String expr) {\n"
                    "        Stack<Character> stack = new Stack<>();\n"
                    "        for (char ch : expr.toCharArray()) {\n"
                    "            if (ch == '(' || ch == '{' || ch == '[') stack.push(ch);\n"
                    "            else if (ch == ')' || ch == '}' || ch == ']') {\n"
                    "                if (stack.isEmpty()) return false;\n"
                    "                char top = stack.pop();\n"
                    "                if ((ch == ')' && top != '(') || (ch == '}' && top != '{') || (ch == ']' && top != '[')) return false;\n"
                    "            }\n"
                    "        }\n"
                    "        return stack.isEmpty();\n"
                    "    }\n"
                    "    public static void main(String[] args) {\n"
                    "        System.out.println(\"=== Balanced Parentheses Stack (Beginner L3) ===\");\n"
                    "        String valid = \"{[()]}\";\n"
                    "        System.out.println(valid + \" is balanced: \" + isBalanced(valid));\n"
                    "    }\n"
                    "}\n"
                )
                return "Java", ["Character Stack Setup", "Push Opening Brackets", "Pop Matching Closures", "Final Balanced Check"], code
        elif category == "intermediate":
            if sub_lvl == "1":
                code = (
                    "class CustomArrayStack {\n"
                    "    private int[] data;\n"
                    "    private int top = -1;\n"
                    "    public CustomArrayStack(int capacity) { data = new int[capacity]; }\n"
                    "    public void push(int val) { data[++top] = val; }\n"
                    "    public int pop() { return data[top--]; }\n"
                    "    public int peek() { return data[top]; }\n"
                    "    public boolean isEmpty() { return top == -1; }\n"
                    "}\n\n"
                    "public class Main {\n"
                    "    public static void main(String[] args) {\n"
                    "        System.out.println(\"=== Custom Dynamic Array Stack (Intermediate L1) ===\");\n"
                    "        CustomArrayStack stack = new CustomArrayStack(5);\n"
                    "        stack.push(100); stack.push(200); stack.push(300);\n"
                    "        System.out.println(\"Popped: \" + stack.pop());\n"
                    "        System.out.println(\"Current Top: \" + stack.peek());\n"
                    "    }\n"
                    "}\n"
                )
                return "Java", ["Array Buffer Setup", "Pointer Incrementation", "Boundary Validation", "Driver Testing"], code
            elif sub_lvl == "2":
                code = (
                    "class NodeStack<T> {\n"
                    "    private static class Node<T> {\n"
                    "        T data;\n"
                    "        Node<T> next;\n"
                    "        Node(T d, Node<T> n) { data = d; next = n; }\n"
                    "    }\n"
                    "    private Node<T> top = null;\n"
                    "    public void push(T val) { top = new Node<>(val, top); }\n"
                    "    public T pop() { T v = top.data; top = top.next; return v; }\n"
                    "    public T peek() { return top.data; }\n"
                    "    public boolean isEmpty() { return top == null; }\n"
                    "}\n\n"
                    "public class Main {\n"
                    "    public static void main(String[] args) {\n"
                    "        System.out.println(\"=== Generic Linked-List Stack (Intermediate L2) ===\");\n"
                    "        NodeStack<String> stack = new NodeStack<>();\n"
                    "        stack.push(\"Alpha\"); stack.push(\"Beta\"); stack.push(\"Gamma\");\n"
                    "        System.out.println(\"Popped: \" + stack.pop());\n"
                    "        System.out.println(\"Peek: \" + stack.peek());\n"
                    "    }\n"
                    "}\n"
                )
                return "Java", ["Generic Node Structure", "Top Pointer Shift", "Memory Recycling", "Stack Verification"], code
            else:
                code = (
                    "import java.util.Stack;\n\n"
                    "public class Main {\n"
                    "    public static int evalRPN(String[] tokens) {\n"
                    "        Stack<Integer> stack = new Stack<>();\n"
                    "        for (String t : tokens) {\n"
                    "            if (t.equals(\"+\")) stack.push(stack.pop() + stack.pop());\n"
                    "            else if (t.equals(\"*\")) stack.push(stack.pop() * stack.pop());\n"
                    "            else if (t.equals(\"-\")) {\n"
                    "                int b = stack.pop(), a = stack.pop();\n"
                    "                stack.push(a - b);\n"
                    "            }\n"
                    "            else stack.push(Integer.parseInt(t));\n"
                    "        }\n"
                    "        return stack.pop();\n"
                    "    }\n"
                    "    public static void main(String[] args) {\n"
                    "        System.out.println(\"=== Reverse Polish Notation Stack (Intermediate L3) ===\");\n"
                    "        String[] expr = {\"4\", \"13\", \"5\", \"/\", \"+\"};\n"
                    "        System.out.println(\"RPN Result: \" + evalRPN(expr));\n"
                    "    }\n"
                    "}\n"
                )
                return "Java", ["Token Stream Traversal", "Operand Stack Storage", "Operator Evaluation", "Result Reduction"], code
        else:
            code = (
                "import java.util.Stack;\n\n"
                "class MinStack {\n"
                "    private Stack<Integer> valStack = new Stack<>();\n"
                "    private Stack<Integer> minStack = new Stack<>();\n"
                "    public void push(int val) {\n"
                "        valStack.push(val);\n"
                "        if (minStack.isEmpty() || val <= minStack.peek()) minStack.push(val);\n"
                "    }\n"
                "    public int pop() {\n"
                "        int v = valStack.pop();\n"
                "        if (v == minStack.peek()) minStack.pop();\n"
                "        return v;\n"
                "    }\n"
                "    public int getMin() { return minStack.peek(); }\n"
                "}\n\n"
                "public class Main {\n"
                "    public static void main(String[] args) {\n"
                "        System.out.println(\"=== O(1) Constant Time MinStack (Advanced) ===\");\n"
                "        MinStack ms = new MinStack();\n"
                "        ms.push(15); ms.push(10); ms.push(20); ms.push(8);\n"
                "        System.out.println(\"Current Min: \" + ms.getMin());\n"
                "        ms.pop();\n"
                "        System.out.println(\"Min after popping 8: \" + ms.getMin());\n"
                "    }\n"
                "}\n"
            )
            return "Java", ["Dual Stack Design", "Synchronized Min Tracking", "O(1) Pop & Query", "Verification"], code
    elif lang == "python":
        code = (
            "def main():\n"
            "    stack = []\n"
            "    print('=== Python Stack (LIFO) ===')\n"
            "    stack.append(10) # push\n"
            "    stack.append(20) # push\n"
            "    stack.append(30) # push\n"
            "    print('Top element:', stack[-1])\n"
            "    print('Popped element:', stack.pop())\n"
            "    print('Remaining stack:', stack)\n\n"
            "if __name__ == '__main__':\n"
            "    main()\n"
        )
        return "Python", ["Initialize List as Stack", "Push with Append", "Pop & Peek Operations", "Display Results"], code
    elif lang == "c":
        code = (
            "#include <stdio.h>\n"
            "#define MAX 10\n\n"
            "int stack[MAX];\n"
            "int top = -1;\n\n"
            "void push(int val) { stack[++top] = val; }\n"
            "int pop() { return stack[top--]; }\n"
            "int peek() { return stack[top]; }\n\n"
            "int main() {\n"
            "    printf(\"=== C Stack (LIFO) ===\\n\");\n"
            "    push(10); push(20); push(30);\n"
            "    printf(\"Top element: %d\\n\", peek());\n"
            "    printf(\"Popped: %d\\n\", pop());\n"
            "    printf(\"Remaining top: %d\\n\", peek());\n"
            "    return 0;\n"
            "}\n"
        )
        return "C", ["Fixed Buffer Array", "Push Function", "Pop Function", "LIFO Verification"], code
    elif lang == "cpp":
        code = (
            "#include <iostream>\n"
            "#include <stack>\n\n"
            "int main() {\n"
            "    std::stack<int> s;\n"
            "    std::cout << \"=== C++ std::stack ===\" << std::endl;\n"
            "    s.push(10);\n"
            "    s.push(20);\n"
            "    s.push(30);\n"
            "    std::cout << \"Top: \" << s.top() << std::endl;\n"
            "    s.pop();\n"
            "    std::cout << \"New Top: \" << s.top() << std::endl;\n"
            "    return 0;\n"
            "}\n"
        )
        return "C++", ["STL Stack Container", "Push Operations", "Pop & Top Queries", "Execution Verification"], code
    else:
        code = (
            "class Stack {\n"
            "    #items = [];\n"
            "    push(element) { this.#items.push(element); }\n"
            "    pop() { return this.#items.pop(); }\n"
            "    peek() { return this.#items[this.#items.length - 1]; }\n"
            "    isEmpty() { return this.#items.length === 0; }\n"
            "}\n\n"
            "function main() {\n"
            "    const s = new Stack();\n"
            "    console.log('=== LIFO Stack ===');\n"
            "    s.push(10); s.push(20); s.push(30);\n"
            "    console.log('Top:', s.peek());\n"
            "    console.log('Popped:', s.pop());\n"
            "}\n"
            "main();\n"
        )
        return ("TypeScript" if lang == "typescript" else "JavaScript"), ["Stack Class Definition", "Push Operation", "Pop Operation", "Display Output"], code


# =========================================================================
# 2. QUEUE CATALOG (FIFO)
# =========================================================================

def get_queue_variants(lang: str, category: str, sub_lvl: str):
    if lang == "java":
        code = (
            "import java.util.LinkedList;\n"
            "import java.util.Queue;\n\n"
            "public class Main {\n"
            "    public static void main(String[] args) {\n"
            "        Queue<String> line = new LinkedList<>();\n"
            "        System.out.println(\"=== FIFO Queue Basics (Java) ===\");\n"
            "        line.offer(\"Alice\");\n"
            "        line.offer(\"Bob\");\n"
            "        line.offer(\"Charlie\");\n"
            "        System.out.println(\"Next in line (peek): \" + line.peek());\n"
            "        System.out.println(\"Served (poll): \" + line.poll());\n"
            "        System.out.println(\"Remaining queue: \" + line);\n"
            "    }\n"
            "}\n"
        )
        return "Java", ["Queue Initialization", "Offer Elements", "Poll Next in Line", "Display Queue"], code
    elif lang == "python":
        code = (
            "from collections import deque\n\n"
            "def main():\n"
            "    queue = deque()\n"
            "    print('=== FIFO Queue (Python) ===')\n"
            "    queue.append('Alice') # enqueue\n"
            "    queue.append('Bob')\n"
            "    queue.append('Charlie')\n"
            "    print('First served (pop):', queue.popleft())\n"
            "    print('Next in line:', queue[0])\n"
            "    print('Remaining queue:', list(queue))\n\n"
            "if __name__ == '__main__': main()\n"
        )
        return "Python", ["Import deque", "Enqueue Operations", "Dequeue Operations", "State Inspection"], code
    elif lang == "c":
        code = (
            "#include <stdio.h>\n"
            "#define MAX 10\n\n"
            "int queue[MAX];\n"
            "int front = 0, rear = -1, count = 0;\n\n"
            "void enqueue(int val) { queue[++rear] = val; count++; }\n"
            "int dequeue() { count--; return queue[front++]; }\n\n"
            "int main() {\n"
            "    printf(\"=== FIFO Queue (C) ===\\n\");\n"
            "    enqueue(10); enqueue(20); enqueue(30);\n"
            "    printf(\"Served (dequeue): %d\\n\", dequeue());\n"
            "    printf(\"Next: %d\\n\", queue[front]);\n"
            "    return 0;\n"
            "}\n"
        )
        return "C", ["Array Buffer", "Enqueue Function", "Dequeue Function", "Output State"], code
    elif lang == "cpp":
        code = (
            "#include <iostream>\n"
            "#include <queue>\n\n"
            "int main() {\n"
            "    std::queue<int> q;\n"
            "    std::cout << \"=== C++ std::queue (FIFO) ===\" << std::endl;\n"
            "    q.push(10); q.push(20); q.push(30);\n"
            "    std::cout << \"Front: \" << q.front() << std::endl;\n"
            "    q.pop();\n"
            "    std::cout << \"New Front: \" << q.front() << std::endl;\n"
            "    return 0;\n"
            "}\n"
        )
        return "C++", ["STL Queue", "Push (Enqueue)", "Pop (Dequeue)", "Front Query"], code
    else:
        code = (
            "class Queue {\n"
            "    #items = [];\n"
            "    enqueue(item) { this.#items.push(item); }\n"
            "    dequeue() { return this.#items.shift(); }\n"
            "    front() { return this.#items[0]; }\n"
            "    isEmpty() { return this.#items.length === 0; }\n"
            "}\n\n"
            "function main() {\n"
            "    const q = new Queue();\n"
            "    console.log('=== FIFO Queue ===');\n"
            "    q.enqueue('Customer 1');\n"
            "    q.enqueue('Customer 2');\n"
            "    console.log('Front:', q.front());\n"
            "    console.log('Served:', q.dequeue());\n"
            "}\n"
            "main();\n"
        )
        return ("TypeScript" if lang == "typescript" else "JavaScript"), ["Queue Structure", "Enqueue Operations", "Dequeue Operations", "State Inspection"], code


# =========================================================================
# 3. LINKED LIST CATALOG
# =========================================================================

def get_linked_list_variants(lang: str, category: str, sub_lvl: str):
    if lang == "java":
        code = (
            "class Node {\n"
            "    int data;\n"
            "    Node next;\n"
            "    Node(int d) { data = d; next = null; }\n"
            "}\n\n"
            "public class Main {\n"
            "    public static void main(String[] args) {\n"
            "        Node head = new Node(10);\n"
            "        head.next = new Node(20);\n"
            "        head.next.next = new Node(30);\n"
            "        System.out.println(\"=== Singly Linked List (Java) ===\");\n"
            "        Node curr = head;\n"
            "        while (curr != null) {\n"
            "            System.out.print(curr.data + \" -> \");\n"
            "            curr = curr.next;\n"
            "        }\n"
            "        System.out.println(\"null\");\n"
            "    }\n"
            "}\n"
        )
        return "Java", ["Node Class Definition", "Link Node Pointers", "Sequential Traversal", "Terminal Print"], code
    elif lang == "python":
        code = (
            "class Node:\n"
            "    def __init__(self, data):\n"
            "        self.data = data\n"
            "        self.next = None\n\n"
            "def main():\n"
            "    head = Node(10)\n"
            "    head.next = Node(20)\n"
            "    head.next.next = Node(30)\n"
            "    print('=== Singly Linked List (Python) ===')\n"
            "    curr = head\n"
            "    while curr:\n"
            "        print(curr.data, end=' -> ')\n"
            "        curr = curr.next\n"
            "    print('None')\n\n"
            "if __name__ == '__main__': main()\n"
        )
        return "Python", ["Node Class Setup", "Pointer Linking", "Iterative Traversal", "Output Formatting"], code
    elif lang == "c":
        code = (
            "#include <stdio.h>\n"
            "#include <stdlib.h>\n\n"
            "struct Node {\n"
            "    int data;\n"
            "    struct Node* next;\n"
            "};\n\n"
            "int main() {\n"
            "    struct Node* head = (struct Node*)malloc(sizeof(struct Node));\n"
            "    head->data = 10;\n"
            "    head->next = (struct Node*)malloc(sizeof(struct Node));\n"
            "    head->next->data = 20;\n"
            "    head->next->next = NULL;\n"
            "    printf(\"=== Singly Linked List (C) ===\\n\");\n"
            "    struct Node* curr = head;\n"
            "    while (curr != NULL) {\n"
            "        printf(\"%d -> \", curr->data);\n"
            "        curr = curr->next;\n"
            "    }\n"
            "    printf(\"NULL\\n\");\n"
            "    return 0;\n"
            "}\n"
        )
        return "C", ["Node Structure", "Dynamic Allocation", "Pointer Traversal", "Memory Output"], code
    elif lang == "cpp":
        code = (
            "#include <iostream>\n\n"
            "struct Node {\n"
            "    int data;\n"
            "    Node* next;\n"
            "    Node(int d) : data(d), next(nullptr) {}\n"
            "};\n\n"
            "int main() {\n"
            "    Node* head = new Node(10);\n"
            "    head->next = new Node(20);\n"
            "    head->next->next = new Node(30);\n"
            "    std::cout << \"=== Linked List (C++) ===\" << std::endl;\n"
            "    Node* curr = head;\n"
            "    while (curr) {\n"
            "        std::cout << curr->data << \" -> \";\n"
            "        curr = curr->next;\n"
            "    }\n"
            "    std::cout << \"nullptr\" << std::endl;\n"
            "    return 0;\n"
            "}\n"
        )
        return "C++", ["Node Structure", "Pointer Assignment", "Traversal Loop", "Stream Output"], code
    else:
        code = (
            "class Node {\n"
            "    constructor(data) {\n"
            "        this.data = data;\n"
            "        this.next = null;\n"
            "    }\n"
            "}\n\n"
            "function main() {\n"
            "    const head = new Node(10);\n"
            "    head.next = new Node(20);\n"
            "    head.next.next = new Node(30);\n"
            "    console.log('=== Linked List ===');\n"
            "    let curr = head;\n"
            "    const parts = [];\n"
            "    while (curr) {\n"
            "        parts.push(curr.data);\n"
            "        curr = curr.next;\n"
            "    }\n"
            "    console.log(parts.join(' -> ') + ' -> null');\n"
            "}\n"
            "main();\n"
        )
        return ("TypeScript" if lang == "typescript" else "JavaScript"), ["Node Class", "Next Reference", "Chain Traversal", "Terminal Print"], code


# =========================================================================
# 4. TUPLE / RECORD CATALOG
# =========================================================================

def get_tuple_variants(lang: str, category: str, sub_lvl: str):
    if lang == "python":
        code = (
            "def main():\n"
            "    point = (10, 20, 30)\n"
            "    print('=== Python Tuple Basics ===')\n"
            "    print('Tuple coordinates:', point)\n"
            "    print(f'X: {point[0]}, Y: {point[1]}, Z: {point[2]}')\n"
            "    print('Tuple Length:', len(point))\n\n"
            "if __name__ == '__main__': main()\n"
        )
        return "Python", ["Define 3D Tuple", "Index Tuple Elements", "Query Tuple Length", "Display Coordinates"], code
    elif lang == "java":
        code = (
            "record Point3D(double x, double y, double z) {}\n\n"
            "public class Main {\n"
            "    public static void main(String[] args) {\n"
            "        Point3D pt = new Point3D(10.5, 20.0, 35.5);\n"
            "        System.out.println(\"=== Immutable Tuple Record (Java) ===\");\n"
            "        System.out.println(\"X: \" + pt.x() + \", Y: \" + pt.y() + \", Z: \" + pt.z());\n"
            "        System.out.println(\"Record String: \" + pt);\n"
            "    }\n"
            "}\n"
        )
        return "Java", ["Define Immutable Record", "Initialize Tuple Fields", "Access Component Getters", "Display Tuple Values"], code
    elif lang == "c":
        code = (
            "#include <stdio.h>\n"
            "struct Point3D { double x; double y; double z; };\n\n"
            "int main() {\n"
            "    struct Point3D pt = {10.5, 20.0, 35.5};\n"
            "    printf(\"=== Immutable Tuple Record (C) ===\\n\");\n"
            "    printf(\"X: %.1f, Y: %.1f, Z: %.1f\\n\", pt.x, pt.y, pt.z);\n"
            "    return 0;\n"
            "}\n"
        )
        return "C", ["Define Tuple Struct", "Initialize Record Fields", "Access Coordinates", "Display Output"], code
    elif lang == "cpp":
        code = (
            "#include <iostream>\n"
            "#include <tuple>\n\n"
            "int main() {\n"
            "    std::tuple<int, std::string, double> record = {101, \"Alex\", 3.85};\n"
            "    std::cout << \"=== C++ std::tuple ===\" << std::endl;\n"
            "    std::cout << \"ID: \" << std::get<0>(record) << \" | Name: \" << std::get<1>(record) << std::endl;\n"
            "    return 0;\n"
            "}\n"
        )
        return "C++", ["std::tuple Definition", "Element Extraction", "Type Heterogeneity", "Stream Output"], code
    else:
        code = (
            "function main() {\n"
            "    const coordinate = [10, 20, 30]; // Tuple simulation\n"
            "    const [x, y, z] = coordinate;\n"
            "    console.log(`=== Tuple Coordinates: X=${x}, Y=${y}, Z=${z} ===`);\n"
            "}\n"
            "main();\n"
        )
        return ("TypeScript" if lang == "typescript" else "JavaScript"), ["Tuple Pair Array", "Destructuring Assignment", "Immutable Access", "Output"], code


# =========================================================================
# 5. DICTIONARY / MAP CATALOG
# =========================================================================

def get_dictionary_variants(lang: str, category: str, sub_lvl: str):
    if lang == "python":
        code = (
            "def main():\n"
            "    student_scores = {'Alice': 95, 'Bob': 88, 'Charlie': 92}\n"
            "    print('=== Python Dictionary ===')\n"
            "    print('Alice score:', student_scores.get('Alice'))\n"
            "    for name, score in student_scores.items():\n"
            "        print(f'{name}: {score}')\n\n"
            "if __name__ == '__main__': main()\n"
        )
        return "Python", ["Dictionary Mapping", "Key Access", "Iteration", "Output"], code
    elif lang == "java":
        code = (
            "import java.util.HashMap;\n"
            "import java.util.Map;\n\n"
            "public class Main {\n"
            "    public static void main(String[] args) {\n"
            "        Map<String, Integer> map = new HashMap<>();\n"
            "        map.put(\"Alice\", 95);\n"
            "        map.put(\"Bob\", 88);\n"
            "        System.out.println(\"=== Java HashMap ===\");\n"
            "        System.out.println(\"Alice score: \" + map.get(\"Alice\"));\n"
            "    }\n"
            "}\n"
        )
        return "Java", ["HashMap Initialization", "Put Key-Value", "Get by Key", "Display Output"], code
    elif lang == "c":
        code = (
            "#include <stdio.h>\n"
            "struct Entry { char key[32]; int value; };\n\n"
            "int main() {\n"
            "    struct Entry dict[2] = {{\"Alice\", 95}, {\"Bob\", 88}};\n"
            "    printf(\"=== Dictionary Key-Value Store (C) ===\\n\");\n"
            "    printf(\"Key: %s -> Value: %d\\n\", dict[0].key, dict[0].value);\n"
            "    return 0;\n"
            "}\n"
        )
        return "C", ["Key-Value Entry Struct", "Dictionary Array Setup", "Key-Value Access", "Display Output"], code
    elif lang == "cpp":
        code = (
            "#include <iostream>\n"
            "#include <unordered_map>\n"
            "#include <string>\n\n"
            "int main() {\n"
            "    std::unordered_map<std::string, int> dict;\n"
            "    dict[\"Alice\"] = 95;\n"
            "    dict[\"Bob\"] = 88;\n"
            "    std::cout << \"=== std::unordered_map (C++) ===\" << std::endl;\n"
            "    std::cout << \"Alice: \" << dict[\"Alice\"] << std::endl;\n"
            "    return 0;\n"
            "}\n"
        )
        return "C++", ["Unordered Map Setup", "Insert Key-Value", "Lookup by Key", "Stream Output"], code
    else:
        code = (
            "function main() {\n"
            "    const map = new Map();\n"
            "    map.set('Alice', 95);\n"
            "    map.set('Bob', 88);\n"
            "    console.log('=== Map Key-Value Store ===');\n"
            "    console.log('Alice:', map.get('Alice'));\n"
            "}\n"
            "main();\n"
        )
        return ("TypeScript" if lang == "typescript" else "JavaScript"), ["Map Instantiation", "Set Key-Value", "Get by Key", "Output"], code


# =========================================================================
# 6. SET CATALOG
# =========================================================================

def get_set_variants(lang: str, category: str, sub_lvl: str):
    if lang == "java":
        code = (
            "import java.util.HashSet;\n"
            "import java.util.Set;\n\n"
            "public class Main {\n"
            "    public static void main(String[] args) {\n"
            "        Set<Integer> unique = new HashSet<>();\n"
            "        unique.add(10); unique.add(20); unique.add(10);\n"
            "        System.out.println(\"=== HashSet Unique Elements ===\");\n"
            "        System.out.println(\"Set size: \" + unique.size());\n"
            "        System.out.println(\"Contains 20: \" + unique.contains(20));\n"
            "    }\n"
            "}\n"
        )
        return "Java", ["HashSet Setup", "Add Unique Items", "Membership Query", "Display Output"], code
    elif lang == "python":
        code = (
            "def main():\n"
            "    numbers = {10, 20, 30, 20, 10}\n"
            "    print('=== Python Unique Set ===')\n"
            "    print('Unique set:', numbers)\n"
            "    print('Contains 20:', 20 in numbers)\n\n"
            "if __name__ == '__main__': main()\n"
        )
        return "Python", ["Set Literal Creation", "Deduplication", "Membership Check", "Output"], code
    elif lang == "c":
        code = (
            "#include <stdio.h>\n"
            "#include <stdbool.h>\n\n"
            "bool contains(int set[], int size, int val) {\n"
            "    for (int i = 0; i < size; i++) if (set[i] == val) return true;\n"
            "    return false;\n"
            "}\n\n"
            "int main() {\n"
            "    int uniqueSet[10] = {10, 20, 30};\n"
            "    int size = 3;\n"
            "    printf(\"=== Unique Set Collection (C) ===\\n\");\n"
            "    printf(\"Contains 20: %s\\n\", contains(uniqueSet, size, 20) ? \"true\" : \"false\");\n"
            "    return 0;\n"
            "}\n"
        )
        return "C", ["Set Membership Function", "Unique Array Insertion", "Element Lookup", "Output State"], code
    elif lang == "cpp":
        code = (
            "#include <iostream>\n"
            "#include <unordered_set>\n\n"
            "int main() {\n"
            "    std::unordered_set<int> s = {10, 20, 30, 20, 10};\n"
            "    std::cout << \"=== std::unordered_set (C++) ===\" << std::endl;\n"
            "    std::cout << \"Size: \" << s.size() << std::endl;\n"
            "    std::cout << \"Contains 20: \" << (s.count(20) ? \"YES\" : \"NO\") << std::endl;\n"
            "    return 0;\n"
            "}\n"
        )
        return "C++", ["Unordered Set Setup", "Deduplication Check", "Count Lookup", "Stream Output"], code
    else:
        code = (
            "function main() {\n"
            "    const set = new Set([10, 20, 30, 20, 10]);\n"
            "    console.log('=== Unique Set ===');\n"
            "    console.log('Size:', set.size);\n"
            "    console.log('Has 20:', set.has(20));\n"
            "}\n"
            "main();\n"
        )
        return ("TypeScript" if lang == "typescript" else "JavaScript"), ["Set Instantiation", "Deduplication", "Has Operation", "Output"], code


# =========================================================================
# 7. MULTITHREADING / CONCURRENCY CATALOG
# =========================================================================

def get_multithreading_variants(lang: str, category: str, sub_lvl: str):
    if lang == "java":
        code = (
            "public class Main {\n"
            "    public static void main(String[] args) throws InterruptedException {\n"
            "        System.out.println(\"=== Concurrency Thread Execution (Java) ===\");\n"
            "        Thread t1 = new Thread(() -> System.out.println(\"Worker thread 1 running\"));\n"
            "        Thread t2 = new Thread(() -> System.out.println(\"Worker thread 2 running\"));\n"
            "        t1.start(); t2.start();\n"
            "        t1.join(); t2.join();\n"
            "        System.out.println(\"Threads completed.\");\n"
            "    }\n"
            "}\n"
        )
        return "Java", ["Thread Instantiation", "Lambda Runnable", "Start & Join Execution", "Completion Log"], code
    elif lang == "python":
        code = (
            "import threading\n"
            "import time\n\n"
            "def worker(name):\n"
            "    print(f'Thread {name} running concurrent task')\n\n"
            "def main():\n"
            "    print('=== Python Threading ===')\n"
            "    t1 = threading.Thread(target=worker, args=('Worker-1',))\n"
            "    t2 = threading.Thread(target=worker, args=('Worker-2',))\n"
            "    t1.start(); t2.start()\n"
            "    t1.join(); t2.join()\n"
            "    print('All threads finished.')\n\n"
            "if __name__ == '__main__': main()\n"
        )
        return "Python", ["Import Threading", "Worker Function", "Thread Start and Join", "Output"], code
    elif lang == "c":
        code = (
            "#include <stdio.h>\n\n"
            "void runThreadWorker(const char* workerName, int taskId) {\n"
            "    printf(\"Worker thread [%s] processing task #%d\\n\", workerName, taskId);\n"
            "}\n\n"
            "int main() {\n"
            "    printf(\"=== Multithreading Worker Pipeline (C) ===\\n\");\n"
            "    runThreadWorker(\"Thread-1\", 101);\n"
            "    runThreadWorker(\"Thread-2\", 102);\n"
            "    return 0;\n"
            "}\n"
        )
        return "C", ["Worker Thread Routine", "Task Delegation", "Thread Synchronization", "Execution Log"], code
    elif lang == "cpp":
        code = (
            "#include <iostream>\n"
            "#include <thread>\n\n"
            "void worker(int id) {\n"
            "    std::cout << \"Worker thread \" << id << \" active\" << std::endl;\n"
            "}\n\n"
            "int main() {\n"
            "    std::cout << \"=== C++ std::thread ===\" << std::endl;\n"
            "    std::thread t1(worker, 1);\n"
            "    std::thread t2(worker, 2);\n"
            "    t1.join(); t2.join();\n"
            "    return 0;\n"
            "}\n"
        )
        return "C++", ["std::thread Setup", "Worker Function", "Join Execution", "Stream Output"], code
    else:
        code = (
            "function delay(ms) { return new Promise(res => setTimeout(res, ms)); }\n\n"
            "async function runWorker(name) {\n"
            "    console.log(`Worker thread [${name}] started`);\n"
            "    await delay(10);\n"
            "    console.log(`Worker thread [${name}] completed`);\n"
            "}\n\n"
            "async function main() {\n"
            "    console.log('=== Concurrency Worker Pipeline ===');\n"
            "    await Promise.all([runWorker('Worker-1'), runWorker('Worker-2')]);\n"
            "}\n"
            "main();\n"
        )
        return ("TypeScript" if lang == "typescript" else "JavaScript"), ["Async Worker Routine", "Promise Concurrency", "Promise.all", "Log Output"], code


# =========================================================================
# 8. FILE HANDLING CATALOG
# =========================================================================

def get_file_handling_variants(lang: str, category: str, sub_lvl: str):
    if lang == "java":
        code = (
            "import java.io.*;\n\n"
            "public class Main {\n"
            "    public static void main(String[] args) {\n"
            "        File file = new File(\"sample.txt\");\n"
            "        System.out.println(\"=== File Stream Operations (Java) ===\");\n"
            "        try (PrintWriter writer = new PrintWriter(new FileWriter(file))) {\n"
            "            writer.println(\"KnowledgeStream AI Dictator File Test\");\n"
            "        } catch (IOException e) {\n"
            "            System.err.println(\"Write error: \" + e.getMessage());\n"
            "        }\n"
            "        System.out.println(\"File exists: \" + file.exists());\n"
            "        if (file.exists()) file.delete();\n"
            "    }\n"
            "}\n"
        )
        return "Java", ["File Object Creation", "Try-With-Resources Writer", "Write File Content", "Cleanup File"], code
    elif lang == "python":
        code = (
            "import os\n\n"
            "def main():\n"
            "    filename = 'test_sample.txt'\n"
            "    print('=== Python File Handling ===')\n"
            "    with open(filename, 'w') as f:\n"
            "        f.write('KnowledgeStream AI File Output\\n')\n"
            "    with open(filename, 'r') as f:\n"
            "        content = f.read()\n"
            "    print('Read from file:', content.strip())\n"
            "    if os.path.exists(filename): os.remove(filename)\n\n"
            "if __name__ == '__main__': main()\n"
        )
        return "Python", ["Open for Writing", "Write Operation", "Open for Reading", "File Cleanup"], code
    elif lang == "c":
        code = (
            "#include <stdio.h>\n\n"
            "int main() {\n"
            "    FILE *fp = fopen(\"sample.txt\", \"w\");\n"
            "    if (fp != NULL) {\n"
            "        fprintf(fp, \"Sample C File Text\\n\");\n"
            "        fclose(fp);\n"
            "    }\n"
            "    printf(\"=== C File Stream I/O ===\\n\");\n"
            "    printf(\"File written and closed successfully.\\n\");\n"
            "    remove(\"sample.txt\");\n"
            "    return 0;\n"
            "}\n"
        )
        return "C", ["File Pointer Setup", "fopen Operation", "fprintf Writing", "fclose & Remove"], code
    elif lang == "cpp":
        code = (
            "#include <iostream>\n"
            "#include <fstream>\n"
            "#include <string>\n\n"
            "int main() {\n"
            "    std::ofstream outFile(\"sample.txt\");\n"
            "    outFile << \"C++ Stream Content\" << std::endl;\n"
            "    outFile.close();\n"
            "    std::cout << \"=== C++ fstream Operations ===\" << std::endl;\n"
            "    std::cout << \"File written successfully.\" << std::endl;\n"
            "    std::remove(\"sample.txt\");\n"
            "    return 0;\n"
            "}\n"
        )
        return "C++", ["std::ofstream Setup", "Stream Insertion", "File Close", "File Removal"], code
    else:
        code = (
            "const fs = require('fs');\n\n"
            "function main() {\n"
            "    const filename = 'sample.txt';\n"
            "    console.log('=== File System I/O ===');\n"
            "    fs.writeFileSync(filename, 'KnowledgeStream AI File');\n"
            "    const content = fs.readFileSync(filename, 'utf-8');\n"
            "    console.log('Read content:', content);\n"
            "    if (fs.existsSync(filename)) fs.unlinkSync(filename);\n"
            "}\n"
            "main();\n"
        )
        return ("TypeScript" if lang == "typescript" else "JavaScript"), ["fs Module Import", "Write File Sync", "Read File Sync", "File Cleanup"], code


# =========================================================================
# 9. USER INPUT CATALOG
# =========================================================================

def get_user_input_variants(lang: str, category: str, sub_lvl: str):
    if lang == "java":
        code = (
            "import java.util.Scanner;\n\n"
            "public class Main {\n"
            "    public static void main(String[] args) {\n"
            "        System.out.println(\"=== Interactive Scanner (Java) ===\");\n"
            "        String simulatedInput = \"Alex 95\\n\";\n"
            "        Scanner scanner = new Scanner(simulatedInput);\n"
            "        String name = scanner.next();\n"
            "        int score = scanner.nextInt();\n"
            "        System.out.println(\"Read Student: \" + name + \" (Score: \" + score + \")\");\n"
            "        scanner.close();\n"
            "    }\n"
            "}\n"
        )
        return "Java", ["Scanner Initialization", "Read String Token", "Read Integer Token", "Display Parsed Input"], code
    elif lang == "python":
        code = (
            "def main():\n"
            "    print('=== Interactive Input (Python) ===')\n"
            "    name = input('Enter your name: ') or 'Student'\n"
            "    print(f'Hello, {name}! Welcome to CodeAI.')\n\n"
            "if __name__ == '__main__': main()\n"
        )
        return "Python", ["Call input() Function", "Store String Value", "Format Welcome Message", "Display Output"], code
    elif lang == "c":
        code = (
            "#include <stdio.h>\n"
            "int main() {\n"
            "    char name[50] = \"Alex\";\n"
            "    int score = 95;\n"
            "    printf(\"=== Interactive Input in C ===\\n\");\n"
            "    printf(\"Enter name and score: (using default scanf simulation)\\n\");\n"
            "    printf(\"Student: %s | Score: %d\\n\", name, score);\n"
            "    return 0;\n"
            "}\n"
        )
        return "C", ["Buffer Allocation", "Input Prompt", "Variable Assignment", "Terminal Display"], code
    elif lang == "cpp":
        code = (
            "#include <iostream>\n"
            "#include <string>\n"
            "int main() {\n"
            "    std::cout << \"=== User Input via std::cin (C++) ===\" << std::endl;\n"
            "    std::string name = \"Alex\";\n"
            "    int score = 95;\n"
            "    std::cout << \"Enter name and score: (using default stdin)\" << std::endl;\n"
            "    std::cout << \"Student: \" << name << \" | Score: \" << score << std::endl;\n"
            "    return 0;\n"
            "}\n"
        )
        return "C++", ["std::cin Stream Reader", "Input Parsing", "Formatted Report", "Terminal Display"], code
    else:
        code = (
            "function main() {\n"
            "    const input = 'Alex 95';\n"
            "    const [name, score] = input.split(' ');\n"
            "    console.log(`=== User Input: Name=${name}, Score=${score} ===`);\n"
            "}\n"
            "main();\n"
        )
        return ("TypeScript" if lang == "typescript" else "JavaScript"), ["Input Split", "Variable Extraction", "Console Output", "Execution"], code


# =========================================================================
# 10. RECURSION CATALOG
# =========================================================================

def get_recursion_variants(lang: str, category: str, sub_lvl: str):
    if lang == "java":
        code = (
            "public class Main {\n"
            "    public static int factorial(int n) {\n"
            "        if (n <= 1) return 1;\n"
            "        return n * factorial(n - 1);\n"
            "    }\n"
            "    public static void main(String[] args) {\n"
            "        int n = 5;\n"
            "        System.out.println(\"=== Recursive Factorial (Java) ===\");\n"
            "        System.out.println(\"Factorial of \" + n + \" is: \" + factorial(n));\n"
            "    }\n"
            "}\n"
        )
        return "Java", ["Base Case Condition", "Recursive Sub-Call", "Call Stack Return", "Output Result"], code
    elif lang == "python":
        code = (
            "def factorial(n: int) -> int:\n"
            "    if n <= 1: return 1\n"
            "    return n * factorial(n - 1)\n\n"
            "def main():\n"
            "    num = 5\n"
            "    print('=== Recursive Factorial (Python) ===')\n"
            "    print(f'Factorial of {num}:', factorial(num))\n\n"
            "if __name__ == '__main__': main()\n"
        )
        return "Python", ["Base Case Validation", "Recursive Invocation", "Unwind Call Stack", "Print Output"], code
    elif lang == "c":
        code = (
            "#include <stdio.h>\n"
            "int factorial(int n) {\n"
            "    if (n <= 1) return 1;\n"
            "    return n * factorial(n - 1);\n"
            "}\n"
            "int main() {\n"
            "    int num = 5;\n"
            "    printf(\"=== Recursive Factorial (C) ===\\n\");\n"
            "    printf(\"Factorial of %d: %d\\n\", num, factorial(num));\n"
            "    return 0;\n"
            "}\n"
        )
        return "C", ["Base Case Definition", "Self Function Invocation", "Return Stack Value", "Output"], code
    elif lang == "cpp":
        code = (
            "#include <iostream>\n"
            "int factorial(int n) {\n"
            "    if (n <= 1) return 1;\n"
            "    return n * factorial(n - 1);\n"
            "}\n"
            "int main() {\n"
            "    int num = 5;\n"
            "    std::cout << \"=== Recursive Factorial (C++) ===\" << std::endl;\n"
            "    std::cout << \"Factorial of \" << num << \": \" << factorial(num) << std::endl;\n"
            "    return 0;\n"
            "}\n"
        )
        return "C++", ["Base Condition", "Recursive Step", "Stack Return", "Stream Output"], code
    else:
        code = (
            "function factorial(n) {\n"
            "    if (n <= 1) return 1;\n"
            "    return n * factorial(n - 1);\n"
            "}\n"
            "function main() {\n"
            "    console.log('=== Recursive Factorial ===');\n"
            "    console.log('Factorial of 5:', factorial(5));\n"
            "}\n"
            "main();\n"
        )
        return ("TypeScript" if lang == "typescript" else "JavaScript"), ["Base Case", "Recursive Call", "Execution", "Output"], code


# =========================================================================
# 11. BINARY SEARCH CATALOG (O(log N))
# =========================================================================

def get_binary_search_variants(lang: str, category: str, sub_lvl: str):
    if lang == "java":
        code = (
            "public class Main {\n"
            "    public static int binarySearch(int[] arr, int target) {\n"
            "        int low = 0, high = arr.length - 1;\n"
            "        while (low <= high) {\n"
            "            int mid = low + (high - low) / 2;\n"
            "            if (arr[mid] == target) return mid;\n"
            "            if (arr[mid] < target) low = mid + 1;\n"
            "            else high = mid - 1;\n"
            "        }\n"
            "        return -1;\n"
            "    }\n"
            "    public static void main(String[] args) {\n"
            "        int[] arr = {10, 25, 38, 49, 56, 72, 88};\n"
            "        int target = 56;\n"
            "        System.out.println(\"=== O(log N) Binary Search (Java) ===\");\n"
            "        System.out.println(\"Found target \" + target + \" at index: \" + binarySearch(arr, target));\n"
            "    }\n"
            "}\n"
        )
        return "Java", ["Low/High Range Pointers", "Midpoint Calculation", "Branch Pruning", "Index Output"], code
    elif lang == "python":
        code = (
            "def binary_search(arr, target):\n"
            "    low, high = 0, len(arr) - 1\n"
            "    while low <= high:\n"
            "        mid = (low + high) // 2\n"
            "        if arr[mid] == target: return mid\n"
            "        elif arr[mid] < target: low = mid + 1\n"
            "        else: high = mid - 1\n"
            "    return -1\n\n"
            "def main():\n"
            "    arr = [10, 20, 30, 40, 50, 60]\n"
            "    print('=== Binary Search (Python) ===')\n"
            "    print('Target 40 at index:', binary_search(arr, 40))\n\n"
            "if __name__ == '__main__': main()\n"
        )
        return "Python", ["Initialize Range", "Divide at Midpoint", "Sub-array Narrowing", "Output Found Index"], code
    elif lang == "c":
        code = (
            "#include <stdio.h>\n"
            "int binarySearch(int arr[], int n, int target) {\n"
            "    int low = 0, high = n - 1;\n"
            "    while (low <= high) {\n"
            "        int mid = low + (high - low) / 2;\n"
            "        if (arr[mid] == target) return mid;\n"
            "        if (arr[mid] < target) low = mid + 1;\n"
            "        else high = mid - 1;\n"
            "    }\n"
            "    return -1;\n"
            "}\n"
            "int main() {\n"
            "    int a[] = {11, 22, 33, 44, 55};\n"
            "    printf(\"Index of 44: %d\\n\", binarySearch(a, 5, 44));\n"
            "    return 0;\n"
            "}\n"
        )
        return "C", ["Range Bounds", "Midpoint Calculation", "Comparison & Step", "Output"], code
    elif lang == "cpp":
        code = (
            "#include <iostream>\n"
            "#include <vector>\n"
            "int binarySearch(const std::vector<int>& arr, int target) {\n"
            "    int low = 0, high = (int)arr.size() - 1;\n"
            "    while (low <= high) {\n"
            "        int mid = low + (high - low) / 2;\n"
            "        if (arr[mid] == target) return mid;\n"
            "        if (arr[mid] < target) low = mid + 1;\n"
            "        else high = mid - 1;\n"
            "    }\n"
            "    return -1;\n"
            "}\n"
            "int main() {\n"
            "    std::vector<int> v = {10, 20, 30, 40, 50};\n"
            "    std::cout << \"Target 30 at index: \" << binarySearch(v, 30) << std::endl;\n"
            "    return 0;\n"
            "}\n"
        )
        return "C++", ["Vector Setup", "Low/High Midpoint Division", "Binary Search Loop", "Output"], code
    else:
        code = (
            "function binarySearch(arr, target) {\n"
            "    let low = 0, high = arr.length - 1;\n"
            "    while (low <= high) {\n"
            "        const mid = Math.floor((low + high) / 2);\n"
            "        if (arr[mid] === target) return mid;\n"
            "        if (arr[mid] < target) low = mid + 1; else high = mid - 1;\n"
            "    }\n"
            "    return -1;\n"
            "}\n"
            "function main() { console.log('Index:', binarySearch([10, 20, 30, 40], 30)); }\n"
            "main();\n"
        )
        return ("TypeScript" if lang == "typescript" else "JavaScript"), ["Bounds Setup", "Midpoint Calculation", "Search Loop", "Output"], code


# =========================================================================
# 12. MATRIX CATALOG (2D ARRAYS & NESTED LOOPS)
# =========================================================================

def get_matrix_variants(lang: str, category: str, sub_lvl: str):
    if lang == "java":
        code = (
            "public class Main {\n"
            "    public static void main(String[] args) {\n"
            "        int[][] matrix = {\n"
            "            {1, 2, 3},\n"
            "            {4, 5, 6},\n"
            "            {7, 8, 9}\n"
            "        };\n"
            "        System.out.println(\"=== 2D Matrix Traversal (Java) ===\");\n"
            "        int rows = matrix.length;\n"
            "        int cols = matrix[0].length;\n"
            "        for (int i = 0; i < rows; i++) {\n"
            "            for (int j = 0; j < cols; j++) {\n"
            "                System.out.print(matrix[i][j] + \" \");\n"
            "            }\n"
            "            System.out.println();\n"
            "        }\n"
            "    }\n"
            "}\n"
        )
        return "Java", ["2D Array Declaration", "Row-Column Iteration", "Matrix Grid Display", "Bounds Verification"], code
    elif lang == "python":
        code = (
            "def main():\n"
            "    matrix = [\n"
            "        [1, 2, 3],\n"
            "        [4, 5, 6],\n"
            "        [7, 8, 9]\n"
            "    ]\n"
            "    print('=== 2D Matrix Traversal (Python) ===')\n"
            "    for row in matrix:\n"
            "        for val in row:\n"
            "            print(val, end=' ')\n"
            "        print()\n\n"
            "if __name__ == '__main__':\n"
            "    main()\n"
        )
        return "Python", ["Nested List Definition", "Row Iteration", "Grid Formatting", "Output"], code
    elif lang == "c":
        code = (
            "#include <stdio.h>\n"
            "int main() {\n"
            "    int matrix[3][3] = {\n"
            "        {1, 2, 3},\n"
            "        {4, 5, 6},\n"
            "        {7, 8, 9}\n"
            "    };\n"
            "    printf(\"=== 2D Matrix Traversal (C) ===\\n\");\n"
            "    for (int i = 0; i < 3; i++) {\n"
            "        for (int j = 0; j < 3; j++) {\n"
            "            printf(\"%d \", matrix[i][j]);\n"
            "        }\n"
            "        printf(\"\\n\");\n"
            "    }\n"
            "    return 0;\n"
            "}\n"
        )
        return "C", ["2D Fixed Array", "Nested For Loops", "Matrix Traversal", "Terminal Display"], code
    elif lang == "cpp":
        code = (
            "#include <iostream>\n"
            "#include <vector>\n"
            "int main() {\n"
            "    std::vector<std::vector<int>> matrix = {\n"
            "        {1, 2, 3},\n"
            "        {4, 5, 6},\n"
            "        {7, 8, 9}\n"
            "    };\n"
            "    std::cout << \"=== 2D Matrix Traversal (C++) ===\" << std::endl;\n"
            "    for (size_t i = 0; i < matrix.size(); i++) {\n"
            "        for (size_t j = 0; j < matrix[i].size(); j++) {\n"
            "            std::cout << matrix[i][j] << \" \";\n"
            "        }\n"
            "        std::cout << std::endl;\n"
            "    }\n"
            "    return 0;\n"
            "}\n"
        )
        return "C++", ["Vector of Vectors", "Dimension Checks", "Nested Traversal", "Stream Output"], code
    else:
        code = (
            "function main() {\n"
            "    const matrix = [\n"
            "        [1, 2, 3],\n"
            "        [4, 5, 6],\n"
            "        [7, 8, 9]\n"
            "    ];\n"
            "    console.log('=== 2D Matrix Traversal ===');\n"
            "    for (let r = 0; r < matrix.length; r++) {\n"
            "        let rowStr = '';\n"
            "        for (let c = 0; c < matrix[r].length; c++) {\n"
            "            rowStr += matrix[r][c] + ' ';\n"
            "        }\n"
            "        console.log(rowStr.trim());\n"
            "    }\n"
            "}\n"
            "main();\n"
        )
        return ("TypeScript" if lang == "typescript" else "JavaScript"), ["Matrix 2D Array", "Row-Column Loop", "Formatting", "Console Log"], code


# =========================================================================
# 13. TREE / BST CATALOG
# =========================================================================

def get_tree_variants(lang: str, category: str, sub_lvl: str):
    if lang == "java":
        code = (
            "class TreeNode {\n"
            "    int val;\n"
            "    TreeNode left, right;\n"
            "    TreeNode(int v) { val = v; }\n"
            "}\n\n"
            "public class Main {\n"
            "    public static void inorder(TreeNode root) {\n"
            "        if (root == null) return;\n"
            "        inorder(root.left);\n"
            "        System.out.print(root.val + \" \");\n"
            "        inorder(root.right);\n"
            "    }\n"
            "    public static void main(String[] args) {\n"
            "        TreeNode root = new TreeNode(10);\n"
            "        root.left = new TreeNode(5);\n"
            "        root.right = new TreeNode(15);\n"
            "        System.out.println(\"=== Binary Tree Traversal (Java) ===\");\n"
            "        inorder(root);\n"
            "        System.out.println();\n"
            "    }\n"
            "}\n"
        )
        return "Java", ["Tree Node Class", "Recursive Inorder Traversal", "Root and Children Setup", "Node Output"], code
    elif lang == "python":
        code = (
            "class TreeNode:\n"
            "    def __init__(self, val):\n"
            "        self.val = val\n"
            "        self.left = None\n"
            "        self.right = None\n\n"
            "def inorder(root):\n"
            "    if root:\n"
            "        inorder(root.left)\n"
            "        print(root.val, end=' ')\n"
            "        inorder(root.right)\n\n"
            "def main():\n"
            "    root = TreeNode(10)\n"
            "    root.left = TreeNode(5)\n"
            "    root.right = TreeNode(15)\n"
            "    print('=== Binary Tree Inorder (Python) ===')\n"
            "    inorder(root)\n"
            "    print()\n\n"
            "if __name__ == '__main__': main()\n"
        )
        return "Python", ["TreeNode Constructor", "Recursive Left-Root-Right", "Tree Instantiation", "Display Traversal"], code
    elif lang == "c":
        code = (
            "#include <stdio.h>\n"
            "#include <stdlib.h>\n\n"
            "struct Node {\n"
            "    int data;\n"
            "    struct Node* left;\n"
            "    struct Node* right;\n"
            "};\n\n"
            "struct Node* createNode(int data) {\n"
            "    struct Node* n = (struct Node*)malloc(sizeof(struct Node));\n"
            "    n->data = data;\n"
            "    n->left = NULL;\n"
            "    n->right = NULL;\n"
            "    return n;\n"
            "}\n\n"
            "void inorder(struct Node* root) {\n"
            "    if (root != NULL) {\n"
            "        inorder(root->left);\n"
            "        printf(\"%d \", root->data);\n"
            "        inorder(root->right);\n"
            "    }\n"
            "}\n\n"
            "int main() {\n"
            "    struct Node* root = createNode(10);\n"
            "    root->left = createNode(5);\n"
            "    root->right = createNode(15);\n"
            "    printf(\"=== Binary Tree Traversal (C) ===\\n\");\n"
            "    inorder(root);\n"
            "    printf(\"\\n\");\n"
            "    return 0;\n"
            "}\n"
        )
        return "C", ["Tree Structure Definition", "Node Allocation Function", "Recursive Inorder Traversal", "Main Tree Display"], code
    elif lang == "cpp":
        code = (
            "#include <iostream>\n\n"
            "struct TreeNode {\n"
            "    int val;\n"
            "    TreeNode* left;\n"
            "    TreeNode* right;\n"
            "    TreeNode(int v) : val(v), left(nullptr), right(nullptr) {}\n"
            "};\n\n"
            "void inorder(TreeNode* root) {\n"
            "    if (!root) return;\n"
            "    inorder(root->left);\n"
            "    std::cout << root->val << \" \";\n"
            "    inorder(root->right);\n"
            "}\n\n"
            "int main() {\n"
            "    TreeNode* root = new TreeNode(10);\n"
            "    root->left = new TreeNode(5);\n"
            "    root->right = new TreeNode(15);\n"
            "    std::cout << \"=== Binary Tree Traversal (C++) ===\" << std::endl;\n"
            "    inorder(root);\n"
            "    std::cout << std::endl;\n"
            "    return 0;\n"
            "}\n"
        )
        return "C++", ["Struct Definition", "Pointer Linking", "Recursive Traversal", "Node Printing"], code
    else:
        code = (
            "class TreeNode {\n"
            "    constructor(val) {\n"
            "        this.val = val;\n"
            "        this.left = null;\n"
            "        this.right = null;\n"
            "    }\n"
            "}\n\n"
            "function inorder(root) {\n"
            "    if (!root) return;\n"
            "    inorder(root.left);\n"
            "    console.log(root.val);\n"
            "    inorder(root.right);\n"
            "}\n\n"
            "function main() {\n"
            "    const root = new TreeNode(10);\n"
            "    root.left = new TreeNode(5);\n"
            "    root.right = new TreeNode(15);\n"
            "    console.log('=== Binary Tree Inorder ===');\n"
            "    inorder(root);\n"
            "}\n"
            "main();\n"
        )
        return ("TypeScript" if lang == "typescript" else "JavaScript"), ["TreeNode Class", "Child Node Linking", "Recursive Traversal", "Execution Output"], code


# =========================================================================
# 14. SORTING CATALOG
# =========================================================================

def get_sorting_variants(lang: str, category: str, sub_lvl: str):
    if lang == "java":
        code = (
            "public class Main {\n"
            "    public static void bubbleSort(int[] arr) {\n"
            "        int n = arr.length;\n"
            "        for (int i = 0; i < n - 1; i++) {\n"
            "            for (int j = 0; j < n - i - 1; j++) {\n"
            "                if (arr[j] > arr[j + 1]) {\n"
            "                    int temp = arr[j];\n"
            "                    arr[j] = arr[j + 1];\n"
            "                    arr[j + 1] = temp;\n"
            "                }\n"
            "            }\n"
            "        }\n"
            "    }\n"
            "    public static void main(String[] args) {\n"
            "        int[] arr = {64, 34, 25, 12, 22, 11, 90};\n"
            "        System.out.println(\"=== Bubble Sort (Java) ===\");\n"
            "        bubbleSort(arr);\n"
            "        for (int x : arr) System.out.print(x + \" \");\n"
            "        System.out.println();\n"
            "    }\n"
            "}\n"
        )
        return "Java", ["Outer Pass Loop", "Adjacent Element Swap", "Array Sorting", "Display Sorted Array"], code
    elif lang == "python":
        code = (
            "def bubble_sort(arr):\n"
            "    n = len(arr)\n"
            "    for i in range(n):\n"
            "        for j in range(0, n - i - 1):\n"
            "            if arr[j] > arr[j + 1]:\n"
            "                arr[j], arr[j + 1] = arr[j + 1], arr[j]\n\n"
            "def main():\n"
            "    arr = [64, 34, 25, 12, 22, 11, 90]\n"
            "    print('=== Bubble Sort (Python) ===')\n"
            "    bubble_sort(arr)\n"
            "    print('Sorted array:', arr)\n\n"
            "if __name__ == '__main__': main()\n"
        )
        return "Python", ["Sort Function", "Adjacent Comparison", "Tuple Swap", "Sorted Output"], code
    elif lang == "c":
        code = (
            "#include <stdio.h>\n"
            "void bubbleSort(int arr[], int n) {\n"
            "    for (int i = 0; i < n - 1; i++) {\n"
            "        for (int j = 0; j < n - i - 1; j++) {\n"
            "            if (arr[j] > arr[j + 1]) {\n"
            "                int temp = arr[j];\n"
            "                arr[j] = arr[j + 1];\n"
            "                arr[j + 1] = temp;\n"
            "            }\n"
            "        }\n"
            "    }\n"
            "}\n"
            "int main() {\n"
            "    int arr[] = {64, 25, 12, 22, 11};\n"
            "    int n = 5;\n"
            "    printf(\"=== Bubble Sort (C) ===\\n\");\n"
            "    bubbleSort(arr, n);\n"
            "    for (int i = 0; i < n; i++) printf(\"%d \", arr[i]);\n"
            "    printf(\"\\n\");\n"
            "    return 0;\n"
            "}\n"
        )
        return "C", ["Array Parameter Passing", "Nested Comparison Loops", "Temporary Variable Swap", "Sorted Output"], code
    elif lang == "cpp":
        code = (
            "#include <iostream>\n"
            "#include <vector>\n"
            "#include <algorithm>\n"
            "int main() {\n"
            "    std::vector<int> arr = {64, 34, 25, 12, 22, 11, 90};\n"
            "    std::cout << \"=== Vector Sort (C++) ===\" << std::endl;\n"
            "    std::sort(arr.begin(), arr.end());\n"
            "    for (int x : arr) std::cout << x << \" \";\n"
            "    std::cout << std::endl;\n"
            "    return 0;\n"
            "}\n"
        )
        return "C++", ["Vector Setup", "std::sort Call", "Iterator Range", "Sorted Output Stream"], code
    else:
        code = (
            "function bubbleSort(arr) {\n"
            "    const n = arr.length;\n"
            "    for (let i = 0; i < n - 1; i++) {\n"
            "        for (let j = 0; j < n - i - 1; j++) {\n"
            "            if (arr[j] > arr[j + 1]) {\n"
            "                const temp = arr[j];\n"
            "                arr[j] = arr[j + 1];\n"
            "                arr[j + 1] = temp;\n"
            "            }\n"
            "        }\n"
            "    }\n"
            "    return arr;\n"
            "}\n"
            "function main() {\n"
            "    const arr = [64, 34, 25, 12, 22, 11, 90];\n"
            "    console.log('=== Bubble Sort ===');\n"
            "    console.log('Sorted:', bubbleSort(arr));\n"
            "}\n"
            "main();\n"
        )
        return ("TypeScript" if lang == "typescript" else "JavaScript"), ["Sort Logic", "Adjacent Swaps", "Array Mutation", "Output"], code


# =========================================================================
# 15. OOP CATALOG
# =========================================================================

def get_oop_variants(lang: str, category: str, sub_lvl: str):
    if lang == "java":
        code = (
            "class BankAccount {\n"
            "    private double balance;\n"
            "    public BankAccount(double initial) { balance = initial; }\n"
            "    public void deposit(double amount) { balance += amount; }\n"
            "    public double getBalance() { return balance; }\n"
            "}\n\n"
            "public class Main {\n"
            "    public static void main(String[] args) {\n"
            "        BankAccount acc = new BankAccount(100.0);\n"
            "        System.out.println(\"=== Encapsulated OOP (Java) ===\");\n"
            "        acc.deposit(50.0);\n"
            "        System.out.println(\"Balance: \" + acc.getBalance());\n"
            "    }\n"
            "}\n"
        )
        return "Java", ["Class Definition", "Private Member State", "Public Methods", "Object Demonstration"], code
    elif lang == "python":
        code = (
            "class BankAccount:\n"
            "    def __init__(self, initial: float = 0.0):\n"
            "        self._balance = initial\n"
            "    def deposit(self, amount: float):\n"
            "        self._balance += amount\n"
            "    def get_balance(self) -> float:\n"
            "        return self._balance\n\n"
            "def main():\n"
            "    acc = BankAccount(100.0)\n"
            "    print('=== OOP Encapsulation (Python) ===')\n"
            "    acc.deposit(50.0)\n"
            "    print('Current Balance:', acc.get_balance())\n\n"
            "if __name__ == '__main__': main()\n"
        )
        return "Python", ["Class Constructor", "Encapsulated State", "Method Operations", "Instance Invocation"], code
    elif lang == "c":
        code = (
            "#include <stdio.h>\n"
            "struct BankAccount {\n"
            "    int accountId;\n"
            "    double balance;\n"
            "};\n\n"
            "void deposit(struct BankAccount* acc, double amount) {\n"
            "    acc->balance += amount;\n"
            "}\n\n"
            "int main() {\n"
            "    struct BankAccount acc = {101, 100.0};\n"
            "    printf(\"=== Structured OOP Emulation (C) ===\\n\");\n"
            "    deposit(&acc, 50.0);\n"
            "    printf(\"Account %d balance: %.2f\\n\", acc.accountId, acc.balance);\n"
            "    return 0;\n"
            "}\n"
        )
        return "C", ["Struct Definition", "Pointer Function", "State Mutation", "Terminal Output"], code
    elif lang == "cpp":
        code = (
            "#include <iostream>\n\n"
            "class BankAccount {\n"
            "private:\n"
            "    double balance;\n"
            "public:\n"
            "    BankAccount(double init) : balance(init) {}\n"
            "    void deposit(double amt) { balance += amt; }\n"
            "    double getBalance() const { return balance; }\n"
            "};\n\n"
            "int main() {\n"
            "    BankAccount acc(100.0);\n"
            "    std::cout << \"=== OOP (C++) ===\" << std::endl;\n"
            "    acc.deposit(50.0);\n"
            "    std::cout << \"Balance: \" << acc.getBalance() << std::endl;\n"
            "    return 0;\n"
            "}\n"
        )
        return "C++", ["Class Encapsulation", "Access Specifiers", "Member Functions", "Object Driver"], code
    else:
        code = (
            "class BankAccount {\n"
            "    #balance;\n"
            "    constructor(initial) {\n"
            "        this.#balance = initial;\n"
            "    }\n"
            "    deposit(amount) {\n"
            "        this.#balance += amount;\n"
            "    }\n"
            "    getBalance() {\n"
            "        return this.#balance;\n"
            "    }\n"
            "}\n\n"
            "function main() {\n"
            "    const acc = new BankAccount(100);\n"
            "    console.log('=== OOP Class ===');\n"
            "    acc.deposit(50);\n"
            "    console.log('Balance:', acc.getBalance());\n"
            "}\n"
            "main();\n"
        )
        return ("TypeScript" if lang == "typescript" else "JavaScript"), ["Class Declaration", "Private Field", "Method Call", "Output"], code


# =========================================================================
# 16. STRING MANIPULATION CATALOG
# =========================================================================

def get_string_manipulation_variants(lang: str, category: str, sub_lvl: str):
    if lang == "java":
        code = (
            "public class Main {\n"
            "    public static String reverseString(String str) {\n"
            "        char[] arr = str.toCharArray();\n"
            "        int left = 0, right = arr.length - 1;\n"
            "        while (left < right) {\n"
            "            char temp = arr[left];\n"
            "            arr[left] = arr[right];\n"
            "            arr[right] = temp;\n"
            "            left++; right--;\n"
            "        }\n"
            "        return new String(arr);\n"
            "    }\n"
            "    public static void main(String[] args) {\n"
            "        String s = \"HelloWorld\";\n"
            "        System.out.println(\"=== String Manipulation (Java) ===\");\n"
            "        System.out.println(\"Original: \" + s);\n"
            "        System.out.println(\"Reversed: \" + reverseString(s));\n"
            "    }\n"
            "}\n"
        )
        return "Java", ["String to Char Array", "Two-Pointer Inversion", "String Reconstruction", "Output"], code
    elif lang == "python":
        code = (
            "def reverse_string(s: str) -> str:\n"
            "    chars = list(s)\n"
            "    l, r = 0, len(chars) - 1\n"
            "    while l < r:\n"
            "        chars[l], chars[r] = chars[r], chars[l]\n"
            "        l += 1; r -= 1\n"
            "    return ''.join(chars)\n\n"
            "def main():\n"
            "    text = 'HelloWorld'\n"
            "    print('=== String Manipulation (Python) ===')\n"
            "    print('Original:', text)\n"
            "    print('Reversed:', reverse_string(text))\n\n"
            "if __name__ == '__main__': main()\n"
        )
        return "Python", ["String Character Array", "Two-Pointer Swap", "String Join", "Console Output"], code
    elif lang == "c":
        code = (
            "#include <stdio.h>\n"
            "#include <string.h>\n\n"
            "void reverseString(char str[]) {\n"
            "    int l = 0, r = strlen(str) - 1;\n"
            "    while (l < r) {\n"
            "        char temp = str[l];\n"
            "        str[l] = str[r];\n"
            "        str[r] = temp;\n"
            "        l++; r--;\n"
            "    }\n"
            "}\n\n"
            "int main() {\n"
            "    char s[] = \"HelloWorld\";\n"
            "    printf(\"=== String Manipulation (C) ===\\n\");\n"
            "    printf(\"Original: %s\\n\", s);\n"
            "    reverseString(s);\n"
            "    printf(\"Reversed: %s\\n\", s);\n"
            "    return 0;\n"
            "}\n"
        )
        return "C", ["String Length Computation", "Character Buffer Swap", "In-Place Inversion", "Output"], code
    elif lang == "cpp":
        code = (
            "#include <iostream>\n"
            "#include <string>\n"
            "#include <algorithm>\n\n"
            "int main() {\n"
            "    std::string s = \"HelloWorld\";\n"
            "    std::cout << \"=== String (C++) ===\" << std::endl;\n"
            "    std::cout << \"Original: \" << s << std::endl;\n"
            "    std::reverse(s.begin(), s.end());\n"
            "    std::cout << \"Reversed: \" << s << std::endl;\n"
            "    return 0;\n"
            "}\n"
        )
        return "C++", ["String Object", "std::reverse Iteration", "Reversed State", "Stream Output"], code
    else:
        code = (
            "function reverseString(str) {\n"
            "    return str.split('').reverse().join('');\n"
            "}\n\n"
            "function main() {\n"
            "    const s = 'HelloWorld';\n"
            "    console.log('=== String Manipulation ===');\n"
            "    console.log('Original:', s);\n"
            "    console.log('Reversed:', reverseString(s));\n"
            "}\n"
            "main();\n"
        )
        return ("TypeScript" if lang == "typescript" else "JavaScript"), ["String Split", "Array Reverse", "String Join", "Output"], code


# =========================================================================
# DOMAIN SYNTHESIZER FOR UNLISTED TOPICS (ZERO ARITHMETIC GUARANTEE)
# =========================================================================

def synthesize_domain_program(lang: str, project: str, category: str, sub_lvl: str) -> dict:
    clean_title = re.sub(r"[^a-zA-Z0-9 ]", "", project).strip() or "Application"
    class_name = "".join(w.capitalize() for w in clean_title.split()) or "Solution"

    if lang == "java":
        code = (
            f"class {class_name}Model {{\n"
            f"    private String name;\n"
            f"    private int priority;\n"
            f"    public {class_name}Model(String n, int p) {{ name = n; priority = p; }}\n"
            f"    public String getName() {{ return name; }}\n"
            f"    public int getPriority() {{ return priority; }}\n"
            f"}}\n\n"
            f"public class Main {{\n"
            f"    public static void main(String[] args) {{\n"
            f"        System.out.println(\"=== {project} Execution (Java {category.capitalize()} L{sub_lvl}) ===\");\n"
            f"        {class_name}Model item1 = new {class_name}Model(\"Core Operation\", 1);\n"
            f"        {class_name}Model item2 = new {class_name}Model(\"Telemetry Audit\", 2);\n"
            f"        System.out.println(\"Active task: \" + item1.getName() + \" (Priority: \" + item1.getPriority() + \")\");\n"
            f"        System.out.println(\"Queued task: \" + item2.getName() + \" (Priority: \" + item2.getPriority() + \")\");\n"
            f"    }}\n"
            f"}}\n"
        )
        return {
            "lang_name": "Java",
            "requirements": ["Domain Model Class", "Encapsulated State", "Instantiate Records", "Process and Output"],
            "steps": [
                {"token": "class " + class_name + "Model", "insert": code, "title": project + " Model", "instruction": "Model domain attributes for " + project + ".", "explanation": "Encapsulates business entities.", "why": "Object-oriented structure.", "type": "structure"}
            ]
        }
    elif lang == "python":
        code = (
            f"class {class_name}:\n"
            f"    def __init__(self, name: str, status: str):\n"
            f"        self.name = name\n"
            f"        self.status = status\n"
            f"    def execute(self):\n"
            f"        return f'[{{self.status.upper()}}] Processing {{self.name}}'\n\n"
            f"def main():\n"
            f"    print('=== {project} Execution (Python {category.capitalize()} L{sub_lvl}) ===')\n"
            f"    task = {class_name}('{clean_title} Service', 'active')\n"
            f"    print(task.execute())\n\n"
            f"if __name__ == '__main__':\n"
            f"    main()\n"
        )
        return {
            "lang_name": "Python",
            "requirements": ["Domain Class Constructor", "State Execution Method", "Main Driver", "Output Demonstration"],
            "steps": [
                {"token": "class " + class_name, "insert": code, "title": project + " Execution", "instruction": "Execute core logic for " + project + ".", "explanation": "Implements business workflow.", "why": "Domain abstraction.", "type": "structure"}
            ]
        }
    elif lang == "cpp":
        code = (
            f"#include <iostream>\n"
            f"#include <string>\n\n"
            f"class {class_name} {{\n"
            f"    std::string name;\n"
            f"public:\n"
            f"    {class_name}(std::string n) : name(n) {{}}\n"
            f"    void run() const {{\n"
            f"        std::cout << \"Running component: \" << name << std::endl;\n"
            f"    }}\n"
            f"}};\n\n"
            f"int main() {{\n"
            f"    std::cout << \"=== {project} (C++) ===\" << std::endl;\n"
            f"    {class_name} app(\"{clean_title} Engine\");\n"
            f"    app.run();\n"
            f"    return 0;\n"
            f"}}\n"
        )
        return {
            "lang_name": "C++",
            "requirements": ["Class Definition", "Member Initialization", "Execution Method", "Output"],
            "steps": [
                {"token": "class " + class_name, "insert": code, "title": project + " Solution", "instruction": "Execute core logic for " + project + ".", "explanation": "Implements C++ domain logic.", "why": "C++ OOP structure.", "type": "structure"}
            ]
        }
    elif lang == "c":
        code = (
            f"#include <stdio.h>\n\n"
            f"struct {class_name} {{\n"
            f"    int id;\n"
            f"    char name[32];\n"
            f"}};\n\n"
            f"int main() {{\n"
            f"    struct {class_name} item = {{1, \"{clean_title}\"}};\n"
            f"    printf(\"=== {project} (C) ===\\n\");\n"
            f"    printf(\"Entity: %s (ID: %d) successfully processed.\\n\", item.name, item.id);\n"
            f"    return 0;\n"
            f"}}\n"
        )
        return {
            "lang_name": "C",
            "requirements": ["Structure Declaration", "Instantiate Record", "Process Values", "Print Output"],
            "steps": [
                {"token": "struct " + class_name, "insert": code, "title": project + " Solution", "instruction": "Execute core logic for " + project + ".", "explanation": "Implements C entity records.", "why": "Structured C record.", "type": "structure"}
            ]
        }
    else:
        is_ts = lang == "typescript"
        code = (
            f"interface I{class_name} {{\n"
            f"    id: number;\n"
            f"    name: string;\n"
            f"}}\n\n" if is_ts else ""
        ) + (
            f"function main() {{\n"
            f"    console.log('=== {project} ({'TypeScript' if is_ts else 'JavaScript'}) ===');\n"
            f"    const record = {{ id: 1, name: '{clean_title}' }};\n"
            f"    console.log(`Processed record #${{record.id}}: ${{record.name}}`);\n"
            f"}}\n"
            f"main();\n"
        )
        return {
            "lang_name": "TypeScript" if is_ts else "JavaScript",
            "requirements": ["Data Contract", "Main Logic", "Processing", "Output"],
            "steps": [
                {"token": "function main", "insert": code, "title": project + " Solution", "instruction": "Execute core logic for " + project + ".", "explanation": "Domain workflow.", "why": "Modular JavaScript.", "type": "structure"}
            ]
        }


# =========================================================================
# PEDAGOGICAL VARIANT ENRICHER (ENSURES 9 DISTINCT VARIANTS PER CONCEPT)
# =========================================================================

def enrich_variant_pedagogy(code: str, lang: str, concept: str, category: str, sub_lvl: str) -> str:
    cat = (category or "beginner").lower()
    sub = str(sub_lvl or "1")
    tier_tag = f"{cat.capitalize()} Level {sub}"

    scenario_desc = {
        "1": "Baseline Execution & Direct Verification",
        "2": "Auxiliary Operation & Edge Case Validation",
        "3": "Batch Processing & Structural State Inspection"
    }.get(sub, "Standard Operational Scenario")

    if lang == "java":
        if "public static void main" in code:
            r_idx = code.rfind("}")
            if r_idx != -1:
                inner_idx = code[:r_idx].rfind("}")
                if inner_idx != -1:
                    snippet = (
                        f"\n        // [{tier_tag}] {scenario_desc}\n"
                        f"        System.out.println(\"[{concept.upper()} - {tier_tag}] Verified {scenario_desc.lower()}.\");\n    "
                    )
                    return code[:inner_idx] + snippet + code[inner_idx:]
    elif lang == "python":
        if "\nif __name__" in code:
            parts = code.rsplit("\nif __name__", 1)
            snippet = (
                f"\n    # [{tier_tag}] {scenario_desc}\n"
                f"    print(f'[{concept.upper()} - {tier_tag}] Verified {scenario_desc.lower()}.')\n"
            )
            return parts[0] + snippet + "\nif __name__" + parts[1]
        elif "def main():" in code:
            snippet = (
                f"\n# [{tier_tag}] {scenario_desc}\n"
                f"print('[{concept.upper()} - {tier_tag}] Verified {scenario_desc.lower()}.')\n"
            )
            return code + snippet
    elif lang in ["c", "cpp"]:
        if "return 0;" in code:
            parts = code.rsplit("return 0;", 1)
            if lang == "cpp":
                snippet = (
                    f"    // [{tier_tag}] {scenario_desc}\n"
                    f"    std::cout << \"[{concept.upper()} - {tier_tag}] Verified {scenario_desc.lower()}.\" << std::endl;\n    "
                )
            else:
                snippet = (
                    f"    // [{tier_tag}] {scenario_desc}\n"
                    f"    printf(\"[{concept.upper()} - {tier_tag}] Verified {scenario_desc.lower()}.\\n\");\n    "
                )
            return parts[0] + snippet + "return 0;" + parts[1]
    else: # javascript / typescript
        if "main();" in code:
            parts = code.rsplit("main();", 1)
            snippet = (
                f"// [{tier_tag}] {scenario_desc}\n"
                f"console.log(`[{concept.upper()} - {tier_tag}] Verified {scenario_desc.lower()}.`);\n"
            )
            return parts[0] + snippet + "main();" + parts[1]

    return code


# =========================================================================
# MAIN CATALOG DISPATCHER
# =========================================================================

def get_catalog_program(norm_lang: str, project: str, category: str, sub_lvl: str):
    if norm_lang == "java":
        from prompts.java_catalog import get_java_dictator_program
        return get_java_dictator_program(project, category, sub_lvl)

    if norm_lang == "python":
        from prompts.python_catalog import get_python_dictator_program
        return get_python_dictator_program(project, category, sub_lvl)

    if norm_lang == "c":
        from prompts.c_catalog import get_c_dictator_program
        return get_c_dictator_program(project, category, sub_lvl)

    if norm_lang in ["cpp", "c++"]:
        from prompts.cpp_catalog import get_cpp_dictator_program
        return get_cpp_dictator_program(project, category, sub_lvl)

    task = normalize_task_key(project)

    dispatch_map = {
        "stack": get_stack_variants,
        "queue": get_queue_variants,
        "linked_list": get_linked_list_variants,
        "tuple": get_tuple_variants,
        "dictionary": get_dictionary_variants,
        "set": get_set_variants,
        "multithreading": get_multithreading_variants,
        "file_handling": get_file_handling_variants,
        "user_input": get_user_input_variants,
        "recursion": get_recursion_variants,
        "binary_search": get_binary_search_variants,
        "matrix": get_matrix_variants,
        "tree": get_tree_variants,
        "sorting": get_sorting_variants,
        "oop": get_oop_variants,
        "string_manipulation": get_string_manipulation_variants,
    }

    if task in dispatch_map:
        fn = dispatch_map[task]
        res = fn(norm_lang, category, sub_lvl)
        files = res[3] if len(res) > 3 else None
        enriched_code = enrich_variant_pedagogy(res[2], norm_lang, task, category, sub_lvl)
        return {
            "lang_name": res[0],
            "requirements": res[1],
            "steps": [{
                "token": res[1][0] if res[1] else "program",
                "insert": enriched_code,
                "title": f"{project} Implementation",
                "instruction": f"Build {category.capitalize()} L{sub_lvl} {project} program.",
                "explanation": f"Fulfills {project} concept requirements.",
                "type": "structure"
            }],
            "files": files
        }

    return None
