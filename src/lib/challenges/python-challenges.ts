import { ProgrammingChallenge } from "./types";

export const PYTHON_CHALLENGES: ProgrammingChallenge[] = [
  // Chapter 0: Intro to Programming
  {
    id: "py_0_1",
    course: "python",
    chapterOrder: 0,
    programIndex: 0,
    title: "Greeting & Environment Check",
    difficulty: "EASY",
    objective: "Write and execute your first Python 3 script using print().",
    description: "Write a Python script that prints `Hello, Python World! KnowledgeStream AI is ready.` to stdout.",
    starterCode: `# Print the greeting message
`,
    constraints: ["Standard stdout output"],
    examples: [
      { input: "", output: "Hello, Python World! KnowledgeStream AI is ready." },
    ],
    testCases: [
      { input: "", expectedOutput: "Hello, Python World! KnowledgeStream AI is ready.", isHidden: false, weight: 1 },
    ],
    referenceSolution: `print("Hello, Python World! KnowledgeStream AI is ready.")
`,
    hints: ["Use print(\"...\") in Python 3."],
  },

  // Chapter 1: Syntax & Variables (Program 1.4 from chapter1.md)
  {
    id: "py_1_1",
    course: "python",
    chapterOrder: 1,
    programIndex: 0,
    title: "BMI Calculator & Type Casting",
    difficulty: "EASY",
    objective: "Parse float inputs and calculate Body Mass Index.",
    description: "Read weight in kg (float) and height in meters (float). Calculate `bmi = weight / (height ** 2)`. Print: `BMI: <bmi>` rounded to 2 decimal places.",
    starterCode: `weight = float(input())
height = float(input())
# Calculate and print BMI
`,
    constraints: ["weight > 0, height > 0"],
    examples: [
      { input: "70.0\n1.75", output: "BMI: 22.86" },
    ],
    testCases: [
      { input: "70.0\n1.75", expectedOutput: "BMI: 22.86", isHidden: false, weight: 1 },
      { input: "85.5\n1.80", expectedOutput: "BMI: 26.39", isHidden: true, weight: 1 },
    ],
    referenceSolution: `weight = float(input())
height = float(input())
bmi = weight / (height ** 2)
print(f"BMI: {bmi:.2f}")
`,
    hints: ["Use bmi = weight / (height ** 2)", "Format with f\"BMI: {bmi:.2f}\""],
  },

  // Chapter 2: Control Flow (Multi-Program: 2 Programs)
  // Program 2.1: Program 2.3 from chapter2.md - Range Accumulator & Even Counter
  {
    id: "py_2_1",
    course: "python",
    chapterOrder: 2,
    programIndex: 0,
    title: "Program A: Range Accumulator & Even Counter",
    difficulty: "EASY",
    objective: "Use for loops with range() and modulo filtering.",
    description: "Read integers `start` and `end` on separate lines (start <= end). Compute the sum of all numbers and count the number of even numbers in [start, end] inclusive. Print: `Sum: <sum>, Evens: <evens>`.",
    starterCode: `start = int(input())
end = int(input())
# Compute sum and even count
`,
    constraints: ["-1000 <= start <= end <= 1000"],
    examples: [
      { input: "1\n5", output: "Sum: 15, Evens: 2" },
    ],
    testCases: [
      { input: "1\n5", expectedOutput: "Sum: 15, Evens: 2", isHidden: false, weight: 1 },
      { input: "4\n10", expectedOutput: "Sum: 49, Evens: 4", isHidden: true, weight: 1 },
    ],
    referenceSolution: `start = int(input())
end = int(input())
total = sum(range(start, end + 1))
evens = sum(1 for x in range(start, end + 1) if x % 2 == 0)
print(f"Sum: {total}, Evens: {evens}")
`,
    hints: ["Use range(start, end + 1) to include the end value.", "Check x % 2 == 0 for evens."],
  },

  // Program 2.2: Program 2.5 from chapter2.md - Target Search with Early Loop Break
  {
    id: "py_2_2",
    course: "python",
    chapterOrder: 2,
    programIndex: 1,
    title: "Program B: Target Search with Early Break",
    difficulty: "EASY",
    objective: "Demonstrate break statement and loop-else clause.",
    description: "Read space-separated integers on line 1, and a `target` integer on line 2. Search for the target. If found, print `Found at index <i>` (first 0-based index) and stop. If not found in the entire list, print `Target not found`.",
    starterCode: `nums = list(map(int, input().split()))
target = int(input())
# Search with early break
`,
    constraints: ["List contains between 1 and 100 integers"],
    examples: [
      { input: "10 20 30 40 50\n30", output: "Found at index 2" },
      { input: "1 2 3\n9", output: "Target not found" },
    ],
    testCases: [
      { input: "10 20 30 40 50\n30", expectedOutput: "Found at index 2", isHidden: false, weight: 1 },
      { input: "1 2 3\n9", expectedOutput: "Target not found", isHidden: false, weight: 1 },
    ],
    referenceSolution: `nums = list(map(int, input().split()))
target = int(input())
for idx, num in enumerate(nums):
    if num == target:
        print(f"Found at index {idx}")
        break
else:
    print("Target not found")
`,
    hints: ["Use Python's for-else construct: else executes only if break did not fire."],
  },

  // Chapter 3: Data Structures (Multi-Program: 2 Programs)
  // Program 3.1: Program 3.3 - Word Frequency Counter with dict.get()
  {
    id: "py_3_1",
    course: "python",
    chapterOrder: 3,
    programIndex: 0,
    title: "Program A: Word Frequency Counter with dict.get()",
    difficulty: "EASY",
    objective: "Build a frequency histogram using dictionary methods.",
    description: "Read a single line of text. Convert all words to lowercase. Count occurrences of each word using a dictionary and `dict.get()`. Print each word and count in alphabetical order: `<word>: <count>`.",
    starterCode: `text = input()
# Build word frequency dictionary
`,
    constraints: ["Words are separated by spaces"],
    examples: [
      { input: "apple banana apple orange", output: "apple: 2\nbanana: 1\norange: 1" },
    ],
    testCases: [
      { input: "apple banana apple orange", expectedOutput: "apple: 2\nbanana: 1\norange: 1", isHidden: false, weight: 1 },
      { input: "Python python PYTHON", expectedOutput: "python: 3", isHidden: true, weight: 1 },
    ],
    referenceSolution: `text = input()
words = text.lower().split()
freq = {}
for w in words:
    freq[w] = freq.get(w, 0) + 1
for w in sorted(freq.keys()):
    print(f"{w}: {freq[w]}")
`,
    hints: ["Use freq[w] = freq.get(w, 0) + 1 and iterate over sorted(freq.keys())."],
  },

  // Program 3.2: Program 3.2 - Coordinate Packing & Unpacking with Tuples
  {
    id: "py_3_2",
    course: "python",
    chapterOrder: 3,
    programIndex: 1,
    title: "Program B: Coordinate Packing & Unpacking with Tuples",
    difficulty: "EASY",
    objective: "Practice tuple immutability, packing, and unpacking.",
    description: "Read `x` and `y` (floats) on separate lines. Pack into tuple `point = (x, y)`. Calculate Euclidean distance from origin `(0, 0)`: `dist = (x**2 + y**2)**0.5`. Print: `Point: (x, y), Distance: <dist>` with distance to 2 decimal places.",
    starterCode: `x = float(input())
y = float(input())
# Tuple packing and distance calculation
`,
    constraints: ["x, y are floats"],
    examples: [
      { input: "3.0\n4.0", output: "Point: (3.0, 4.0), Distance: 5.00" },
    ],
    testCases: [
      { input: "3.0\n4.0", expectedOutput: "Point: (3.0, 4.0), Distance: 5.00", isHidden: false, weight: 1 },
      { input: "1.0\n1.0", expectedOutput: "Point: (1.0, 1.0), Distance: 1.41", isHidden: true, weight: 1 },
    ],
    referenceSolution: `x = float(input())
y = float(input())
point = (x, y)
px, py = point
dist = (px**2 + py**2)**0.5
print(f"Point: {point}, Distance: {dist:.2f}")
`,
    hints: ["Unpack tuple using px, py = point.", "Calculate distance with (px**2 + py**2)**0.5."],
  },

  // Chapter 4: Functions (Multi-Program: 2 Programs)
  // Program 4.1: Program 4.3 - Recursive Factorial with Base Case Guard
  {
    id: "py_4_1",
    course: "python",
    chapterOrder: 4,
    programIndex: 0,
    title: "Program A: Recursive Factorial with Base Case Guard",
    difficulty: "EASY",
    objective: "Implement a recursive function with base case validation.",
    description: "Write a recursive function `factorial(n)`. Read `n`. If `n < 0`, print `Invalid`. If `n >= 0`, print `n!`.",
    starterCode: `def factorial(n):
    # Implement recursion
    pass

n = int(input())
`,
    constraints: ["-10 <= n <= 15"],
    examples: [
      { input: "5", output: "120" },
      { input: "-1", output: "Invalid" },
    ],
    testCases: [
      { input: "5", expectedOutput: "120", isHidden: false, weight: 1 },
      { input: "0", expectedOutput: "1", isHidden: false, weight: 1 },
      { input: "-1", expectedOutput: "Invalid", isHidden: false, weight: 1 },
      { input: "6", expectedOutput: "720", isHidden: true, weight: 1 },
    ],
    referenceSolution: `def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

n = int(input())
if n < 0:
    print("Invalid")
else:
    print(factorial(n))
`,
    hints: ["Base case: if n <= 1: return 1. Guard against negative inputs."],
  },

  // Program 4.2: Program 4.1 - Arbitrary Arguments Accumulator (*args)
  {
    id: "py_4_2",
    course: "python",
    chapterOrder: 4,
    programIndex: 1,
    title: "Program B: Arbitrary Arguments Accumulator (*args)",
    difficulty: "EASY",
    objective: "Define and call functions with variable-length argument lists (*args).",
    description: "Write a function `multiply_all(*args)` that takes an arbitrary number of numeric arguments and returns their product (or 1 if no arguments). Read space-separated integers, unpack them into `multiply_all(*nums)`, and print the product.",
    starterCode: `def multiply_all(*args):
    # Multiply all arguments
    pass

nums = list(map(int, input().split()))
`,
    constraints: ["Numbers are integers"],
    examples: [
      { input: "2 3 4", output: "24" },
      { input: "5", output: "5" },
    ],
    testCases: [
      { input: "2 3 4", expectedOutput: "24", isHidden: false, weight: 1 },
      { input: "5", expectedOutput: "5", isHidden: false, weight: 1 },
      { input: "1 2 3 4 5", expectedOutput: "120", isHidden: true, weight: 1 },
    ],
    referenceSolution: `def multiply_all(*args):
    res = 1
    for a in args:
        res *= a
    return res

nums = list(map(int, input().split()))
print(multiply_all(*nums))
`,
    hints: ["Iterate through args in a loop: res = 1; for a in args: res *= a."],
  },

  // Chapter 5: OOP (Program 5.4 from chapter5.md)
  {
    id: "py_5_1",
    course: "python",
    chapterOrder: 5,
    programIndex: 0,
    title: "Encapsulated BankAccount with Private Attributes",
    difficulty: "MEDIUM",
    objective: "Implement encapsulation using private attribute prefix __.",
    description: "Create class `BankAccount` with private attribute `__balance`. Provide `deposit(amount)` (rejecting amounts <= 0 with `Error: Deposit must be positive`) and `get_balance()`. Read deposit amount. Print `Balance: <balance>` rounded to 1 decimal place or error.",
    starterCode: `class BankAccount:
    def __init__(self):
        self.__balance = 0.0

    # Implement deposit and get_balance

amt = float(input())
`,
    constraints: ["Initial balance is 0.0"],
    examples: [
      { input: "250.0", output: "Balance: 250.0" },
      { input: "-50.0", output: "Error: Deposit must be positive" },
    ],
    testCases: [
      { input: "250.0", expectedOutput: "Balance: 250.0", isHidden: false, weight: 1 },
      { input: "-50.0", expectedOutput: "Error: Deposit must be positive", isHidden: false, weight: 1 },
      { input: "0", expectedOutput: "Error: Deposit must be positive", isHidden: true, weight: 1 },
    ],
    referenceSolution: `class BankAccount:
    def __init__(self):
        self.__balance = 0.0

    def deposit(self, amount):
        if amount <= 0:
            return False
        self.__balance += amount
        return True

    def get_balance(self):
        return self.__balance

amt = float(input())
acc = BankAccount()
if acc.deposit(amt):
    print(f"Balance: {acc.get_balance():.1f}")
else:
    print("Error: Deposit must be positive")
`,
    hints: ["Use self.__balance to denote private attributes in Python."],
  },

  // Chapter 6: Functional & Generators (Multi-Program: 2 Programs)
  // Program 6.1: Program 6.2 - Countdown Generator with yield
  {
    id: "py_6_1",
    course: "python",
    chapterOrder: 6,
    programIndex: 0,
    title: "Program A: Countdown Generator with yield",
    difficulty: "EASY",
    objective: "Implement a generator function using yield.",
    description: "Write generator function `countdown(start)`. Yield numbers from `start` down to 1. Read integer `n`. Iterate over `countdown(n)` and print space-separated on a single line.",
    starterCode: `def countdown(start):
    # Yield numbers down to 1
    pass

n = int(input())
`,
    constraints: ["1 <= n <= 50"],
    examples: [
      { input: "5", output: "5 4 3 2 1" },
    ],
    testCases: [
      { input: "5", expectedOutput: "5 4 3 2 1", isHidden: false, weight: 1 },
      { input: "3", expectedOutput: "3 2 1", isHidden: true, weight: 1 },
    ],
    referenceSolution: `def countdown(start):
    while start >= 1:
        yield start
        start -= 1

n = int(input())
print(*(countdown(n)))
`,
    hints: ["Use while start >= 1: yield start; start -= 1."],
  },

  // Program 6.2: Program 6.3 - Logging Decorator
  {
    id: "py_6_2",
    course: "python",
    chapterOrder: 6,
    programIndex: 1,
    title: "Program B: Logging Decorator",
    difficulty: "MEDIUM",
    objective: "Implement a higher-order decorator wrapping a function.",
    description: "Write decorator `@log_call` that prints `[LOG] Calling <func_name>` before executing the function. Apply to `add(a, b)` which prints `Result: <a + b>`. Read `a` and `b`. Execute `add(a, b)`.",
    starterCode: `def log_call(func):
    # Decorator wrapper
    pass

@log_call
def add(a, b):
    print(f"Result: {a + b}")

a = int(input())
b = int(input())
add(a, b)
`,
    constraints: ["Integers a, b"],
    examples: [
      { input: "3\n4", output: "[LOG] Calling add\nResult: 7" },
    ],
    testCases: [
      { input: "3\n4", expectedOutput: "[LOG] Calling add\nResult: 7", isHidden: false, weight: 1 },
      { input: "10\n25", expectedOutput: "[LOG] Calling add\nResult: 35", isHidden: true, weight: 1 },
    ],
    referenceSolution: `def log_call(func):
    def wrapper(*args, **kwargs):
        print(f"[LOG] Calling {func.__name__}")
        return func(*args, **kwargs)
    return wrapper

@log_call
def add(a, b):
    print(f"Result: {a + b}")

a = int(input())
b = int(input())
add(a, b)
`,
    hints: ["Inside wrapper, print f\"[LOG] Calling {func.__name__}\" and return func(*args, **kwargs)."],
  },

  // Chapter 7: Error Handling & I/O (Multi-Program: 2 Programs)
  // Program 7.1: Program 7.1 - Safe Integer Division with try-except
  {
    id: "py_7_1",
    course: "python",
    chapterOrder: 7,
    programIndex: 0,
    title: "Program A: Safe Integer Division with try-except",
    difficulty: "EASY",
    objective: "Trap ValueError and ZeroDivisionError in Python.",
    description: "Read two tokens `a` and `b`. Convert both to integers. Catch `ValueError` (if non-numeric) and print `Error: Invalid integer format`. Catch `ZeroDivisionError` (if b == 0) and print `Error: Division by zero`. Otherwise print `Result: <a // b>`.",
    starterCode: `a = input()
b = input()
# Try-except block for division
`,
    constraints: ["Tokens are strings"],
    examples: [
      { input: "10\n2", output: "Result: 5" },
      { input: "10\n0", output: "Error: Division by zero" },
      { input: "10\nabc", output: "Error: Invalid integer format" },
    ],
    testCases: [
      { input: "10\n2", expectedOutput: "Result: 5", isHidden: false, weight: 1 },
      { input: "10\n0", expectedOutput: "Error: Division by zero", isHidden: false, weight: 1 },
      { input: "10\nabc", expectedOutput: "Error: Invalid integer format", isHidden: false, weight: 1 },
    ],
    referenceSolution: `a = input()
b = input()
try:
    x = int(a)
    y = int(b)
    res = x // y
    print(f"Result: {res}")
except ValueError:
    print("Error: Invalid integer format")
except ZeroDivisionError:
    print("Error: Division by zero")
`,
    hints: ["Handle ValueError for conversion and ZeroDivisionError for division."],
  },

  // Program 7.2: Program 7.3 - Custom InvalidExpenseError Class
  {
    id: "py_7_2",
    course: "python",
    chapterOrder: 7,
    programIndex: 1,
    title: "Program B: Custom InvalidExpenseError Class",
    difficulty: "EASY",
    objective: "Define and raise a user-defined Exception class.",
    description: "Define custom exception `InvalidExpenseError(Exception)`. Read expense amount (float). If amount <= 0, raise `InvalidExpenseError(\"Expense must be positive\")` and catch it, printing `Error: Expense must be positive`. Otherwise print `Expense logged: <amount>` with 2 decimal places.",
    starterCode: `class InvalidExpenseError(Exception):
    pass

amt = float(input())
# Raise and catch InvalidExpenseError
`,
    constraints: ["Amount is a float"],
    examples: [
      { input: "45.50", output: "Expense logged: 45.50" },
      { input: "-10.0", output: "Error: Expense must be positive" },
    ],
    testCases: [
      { input: "45.50", expectedOutput: "Expense logged: 45.50", isHidden: false, weight: 1 },
      { input: "-10.0", expectedOutput: "Error: Expense must be positive", isHidden: false, weight: 1 },
    ],
    referenceSolution: `class InvalidExpenseError(Exception):
    pass

amt = float(input())
try:
    if amt <= 0:
        raise InvalidExpenseError("Expense must be positive")
    print(f"Expense logged: {amt:.2f}")
except InvalidExpenseError as e:
    print(f"Error: {e}")
`,
    hints: ["Use raise InvalidExpenseError(...) if amt <= 0 and catch with except InvalidExpenseError as e."],
  },

  // Chapter 8: Modules & Packages (Program 8.2 from chapter8.md)
  {
    id: "py_8_1",
    course: "python",
    chapterOrder: 8,
    programIndex: 0,
    title: "Duplicate Counter with collections.Counter",
    difficulty: "EASY",
    objective: "Utilize Python standard library collections.Counter.",
    description: "Read space-separated numbers on line 1. Using `collections.Counter`, count duplicates (elements with frequency > 1). Print each duplicate and its count in ascending order of element: `<element>: <count>`. If no duplicates, print `No duplicates`.",
    starterCode: `from collections import Counter

nums = list(map(int, input().split()))
# Count duplicates
`,
    constraints: ["Numbers are integers"],
    examples: [
      { input: "1 2 3 2 4 1 5", output: "1: 2\n2: 2" },
      { input: "1 2 3 4", output: "No duplicates" },
    ],
    testCases: [
      { input: "1 2 3 2 4 1 5", expectedOutput: "1: 2\n2: 2", isHidden: false, weight: 1 },
      { input: "1 2 3 4", expectedOutput: "No duplicates", isHidden: false, weight: 1 },
    ],
    referenceSolution: `from collections import Counter

nums = list(map(int, input().split()))
counts = Counter(nums)
duplicates = sorted([k for k, v in counts.items() if v > 1])
if not duplicates:
    print("No duplicates")
else:
    for d in duplicates:
        print(f"{d}: {counts[d]}")
`,
    hints: ["Use Counter(nums) and filter with [k for k, v in counts.items() if v > 1]."],
  },

  // Chapter 9: Applied Python (Program 9.3 from chapter9.md)
  {
    id: "py_9_1",
    course: "python",
    chapterOrder: 9,
    programIndex: 0,
    title: "Regex Pattern Matcher for Email Addresses",
    difficulty: "MEDIUM",
    objective: "Use Python's re standard module for pattern validation.",
    description: "Read an email string. Using regular expression pattern `^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$`, validate whether the email address is formatted correctly. Print `VALID` or `INVALID`.",
    starterCode: `import re

email = input().strip()
# Regex validation
`,
    constraints: ["Single string input"],
    examples: [
      { input: "student@knowledgestream.ai", output: "VALID" },
      { input: "invalid-email@", output: "INVALID" },
    ],
    testCases: [
      { input: "student@knowledgestream.ai", expectedOutput: "VALID", isHidden: false, weight: 1 },
      { input: "invalid-email@", expectedOutput: "INVALID", isHidden: false, weight: 1 },
      { input: "alice.smith123@gmail.com", expectedOutput: "VALID", isHidden: true, weight: 1 },
    ],
    referenceSolution: `import re

email = input().strip()
pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$"
if re.match(pattern, email):
    print("VALID")
else:
    print("INVALID")
`,
    hints: ["Use re.match(pattern, email) with raw string prefix r\"...\"."],
  },

  // Chapter 10: Advanced Python (Program 10.1 from chapter10.md)
  {
    id: "py_10_1",
    course: "python",
    chapterOrder: 10,
    programIndex: 0,
    title: "Custom Sequence Class with Dunder __getitem__ & __len__",
    difficulty: "MEDIUM",
    objective: "Implement Python Data Model dunder methods __len__ and __getitem__.",
    description: "Create a class `CustomDeck` initialized with a list of card names. Implement `__len__(self)` returning count, and `__getitem__(self, position)` allowing indexing and slicing. Read space-separated card names. Print `Count: <len>, First: <deck[0]>, Last: <deck[-1]>`.",
    starterCode: `class CustomDeck:
    def __init__(self, cards):
        self._cards = cards

    # Implement __len__ and __getitem__

cards = input().split()
deck = CustomDeck(cards)
`,
    constraints: ["List has at least 1 card"],
    examples: [
      { input: "Ace King Queen Jack", output: "Count: 4, First: Ace, Last: Jack" },
    ],
    testCases: [
      { input: "Ace King Queen Jack", expectedOutput: "Count: 4, First: Ace, Last: Jack", isHidden: false, weight: 1 },
      { input: "Spades", expectedOutput: "Count: 1, First: Spades, Last: Spades", isHidden: true, weight: 1 },
    ],
    referenceSolution: `class CustomDeck:
    def __init__(self, cards):
        self._cards = cards

    def __len__(self):
        return len(self._cards)

    def __getitem__(self, position):
        return self._cards[position]

cards = input().split()
deck = CustomDeck(cards)
print(f"Count: {len(deck)}, First: {deck[0]}, Last: {deck[-1]}")
`,
    hints: ["Implementing __len__ and __getitem__ makes your custom class a first-class Python sequence."],
  },
];
