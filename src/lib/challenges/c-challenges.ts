import { ProgrammingChallenge } from "./types";

export const C_CHALLENGES: ProgrammingChallenge[] = [
  // Chapter 0: Introduction to C
  {
    id: "c_0_1",
    course: "c",
    chapterOrder: 0,
    programIndex: 0,
    title: "Canonical Hello, World!",
    difficulty: "EASY",
    objective: "Write and execute your first C program using standard I/O.",
    description: "Write a standard C program that prints `Hello, World!` to stdout and terminates with exit code 0.",
    starterCode: `#include <stdio.h>

int main(void) {
    // Print Hello, World!
    return 0;
}`,
    constraints: ["Return code must be 0"],
    examples: [
      { input: "", output: "Hello, World!" },
    ],
    testCases: [
      { input: "", expectedOutput: "Hello, World!", isHidden: false, weight: 1 },
    ],
    referenceSolution: `#include <stdio.h>

int main(void) {
    printf("Hello, World!\\n");
    return 0;
}`,
    hints: ["Use printf(\"Hello, World!\\n\");", "Include <stdio.h>."],
  },

  // Chapter 1: C Basics
  {
    id: "c_1_1",
    course: "c",
    chapterOrder: 1,
    programIndex: 0,
    title: "Temperature Converter (F to C)",
    difficulty: "EASY",
    objective: "Practice arithmetic expressions and floating-point formatting.",
    description: "Read a temperature in Fahrenheit (float). Convert to Celsius using `C = (F - 32) * 5.0 / 9.0`. Print formatted to 2 decimal places: `Celsius: <value>`.",
    starterCode: `#include <stdio.h>

int main(void) {
    float fahrenheit;
    // Read and convert
    return 0;
}`,
    constraints: ["Input is a valid floating point number"],
    examples: [
      { input: "98.6", output: "Celsius: 37.00" },
      { input: "32.0", output: "Celsius: 0.00" },
    ],
    testCases: [
      { input: "98.6", expectedOutput: "Celsius: 37.00", isHidden: false, weight: 1 },
      { input: "32.0", expectedOutput: "Celsius: 0.00", isHidden: false, weight: 1 },
      { input: "212.0", expectedOutput: "Celsius: 100.00", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <stdio.h>

int main(void) {
    float f;
    if (scanf("%f", &f) == 1) {
        float c = (f - 32.0f) * 5.0f / 9.0f;
        printf("Celsius: %.2f\\n", c);
    }
    return 0;
}`,
    hints: ["Use (f - 32.0) * 5.0 / 9.0.", "Print with %.2f."],
  },

  // Chapter 2: Control Flow (Multi-Program: 3 Programs)
  // Program 2.1: Accumulator Sum and Average
  {
    id: "c_2_1",
    course: "c",
    chapterOrder: 2,
    programIndex: 0,
    title: "Program A: Sum and Average of Numbers",
    difficulty: "EASY",
    objective: "Implement while loop accumulator and float calculation.",
    description: "Read integer `n` followed by `n` integers. Calculate the sum and average. Print `Sum: <sum>, Average: <avg>` with average formatted to 2 decimal places.",
    starterCode: `#include <stdio.h>

int main(void) {
    int n;
    // Accumulate sum and average
    return 0;
}`,
    constraints: ["1 <= n <= 100"],
    examples: [
      { input: "4\n10 20 30 40", output: "Sum: 100, Average: 25.00" },
    ],
    testCases: [
      { input: "4\n10 20 30 40", expectedOutput: "Sum: 100, Average: 25.00", isHidden: false, weight: 1 },
      { input: "3\n5 10 12", expectedOutput: "Sum: 27, Average: 9.00", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    int sum = 0;
    for (int i = 0; i < n; i++) {
        int val;
        scanf("%d", &val);
        sum += val;
    }
    double avg = (double)sum / n;
    printf("Sum: %d, Average: %.2f\\n", sum, avg);
    return 0;
}`,
    hints: ["Cast sum to double when computing average: (double)sum / n."],
  },

  // Program 2.2: Min and Max Array Scan
  {
    id: "c_2_2",
    course: "c",
    chapterOrder: 2,
    programIndex: 1,
    title: "Program B: Min and Max Array Scan",
    difficulty: "EASY",
    objective: "Find extreme elements in an array using single-pass conditional scan.",
    description: "Read `n` followed by `n` integers. Find the minimum and maximum values. Print: `Min: <min>, Max: <max>`.",
    starterCode: `#include <stdio.h>

int main(void) {
    int n;
    // Find min and max
    return 0;
}`,
    constraints: ["1 <= n <= 500"],
    examples: [
      { input: "5\n23 12 89 5 44", output: "Min: 5, Max: 89" },
    ],
    testCases: [
      { input: "5\n23 12 89 5 44", expectedOutput: "Min: 5, Max: 89", isHidden: false, weight: 1 },
      { input: "3\n-5 -20 -1", expectedOutput: "Min: -20, Max: -1", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    int min, max, val;
    scanf("%d", &val);
    min = max = val;
    for (int i = 1; i < n; i++) {
        scanf("%d", &val);
        if (val < min) min = val;
        if (val > max) max = val;
    }
    printf("Min: %d, Max: %d\\n", min, max);
    return 0;
}`,
    hints: ["Initialize min and max with the first element.", "Update min and max inside the loop."],
  },

  // Program 2.3: Number Pattern Triangle Generator
  {
    id: "c_2_3",
    course: "c",
    chapterOrder: 2,
    programIndex: 2,
    title: "Program C: Number Pattern Triangle",
    difficulty: "EASY",
    objective: "Master nested loops to generate structured numeric output.",
    description: "Read an integer `h` (height). Print a number triangle where row `i` (from 1 to h) contains numbers from 1 to `i` separated by spaces.",
    starterCode: `#include <stdio.h>

int main(void) {
    int h;
    // Generate triangle
    return 0;
}`,
    constraints: ["1 <= h <= 10"],
    examples: [
      { input: "3", output: "1\n1 2\n1 2 3" },
    ],
    testCases: [
      { input: "3", expectedOutput: "1\n1 2\n1 2 3", isHidden: false, weight: 1 },
      { input: "4", expectedOutput: "1\n1 2\n1 2 3\n1 2 3 4", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <stdio.h>

int main(void) {
    int h;
    if (scanf("%d", &h) != 1) return 0;
    for (int i = 1; i <= h; i++) {
        for (int j = 1; j <= i; j++) {
            printf("%d%s", j, (j == i) ? "" : " ");
        }
        printf("\\n");
    }
    return 0;
}`,
    hints: ["Outer loop runs 1..h, inner loop runs 1..i."],
  },

  // Chapter 3: Functions (Multi-Program: 2 Programs)
  // Program 3.1: Recursive Factorial
  {
    id: "c_3_1",
    course: "c",
    chapterOrder: 3,
    programIndex: 0,
    title: "Program A: Recursive Factorial",
    difficulty: "EASY",
    objective: "Implement a recursive function with base cases.",
    description: "Write a recursive function `long long factorial(int n)`. Read `n`. If `n < 0`, print `Invalid`. Otherwise print `n!`.",
    starterCode: `#include <stdio.h>

long long factorial(int n) {
    // Recursive base & step
}

int main(void) {
    int n;
    // Read and print
    return 0;
}`,
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
    referenceSolution: `#include <stdio.h>

long long factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    if (n < 0) {
        printf("Invalid\\n");
    } else {
        printf("%lld\\n", factorial(n));
    }
    return 0;
}`,
    hints: ["Base case: if (n <= 1) return 1; Recursive step: return n * factorial(n - 1);"],
  },

  // Program 3.2: Fibonacci Sequence Generator
  {
    id: "c_3_2",
    course: "c",
    chapterOrder: 3,
    programIndex: 1,
    title: "Program B: Fibonacci Sequence Generator",
    difficulty: "EASY",
    objective: "Implement iterative sequence generation using functions.",
    description: "Write a function to generate the first `n` terms of the Fibonacci sequence (starting 0, 1, 1, 2, ...). Print space-separated on a single line.",
    starterCode: `#include <stdio.h>

void printFibonacci(int n) {
    // Generate sequence
}

int main(void) {
    int n;
    scanf("%d", &n);
    printFibonacci(n);
    return 0;
}`,
    constraints: ["1 <= n <= 20"],
    examples: [
      { input: "5", output: "0 1 1 2 3" },
    ],
    testCases: [
      { input: "5", expectedOutput: "0 1 1 2 3", isHidden: false, weight: 1 },
      { input: "2", expectedOutput: "0 1", isHidden: false, weight: 1 },
      { input: "7", expectedOutput: "0 1 1 2 3 5 8", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <stdio.h>

void printFibonacci(int n) {
    if (n <= 0) return;
    long long a = 0, b = 1;
    for (int i = 0; i < n; i++) {
        printf("%lld%s", a, (i == n - 1) ? "" : " ");
        long long next = a + b;
        a = b;
        b = next;
    }
    printf("\\n");
}

int main(void) {
    int n;
    if (scanf("%d", &n) == 1) {
        printFibonacci(n);
    }
    return 0;
}`,
    hints: ["Start with a = 0, b = 1. Update: next = a + b, a = b, b = next."],
  },

  // Chapter 4: Arrays & Strings (Multi-Program: 2 Programs)
  // Program 4.1: In-Place String Reversal & Palindrome Checker
  {
    id: "c_4_1",
    course: "c",
    chapterOrder: 4,
    programIndex: 0,
    title: "Program A: String Reversal & Palindrome Checker",
    difficulty: "EASY",
    objective: "Manipulate null-terminated C-strings in place.",
    description: "Read a single word (char array). Check if it is a palindrome. Print `Reversed: <rev>, Palindrome: <YES|NO>`.",
    starterCode: `#include <stdio.h>
#include <string.h>

int main(void) {
    char str[100];
    scanf("%s", str);
    // Reverse and test
    return 0;
}`,
    constraints: ["Word length <= 99"],
    examples: [
      { input: "madam", output: "Reversed: madam, Palindrome: YES" },
      { input: "code", output: "Reversed: edoc, Palindrome: NO" },
    ],
    testCases: [
      { input: "madam", expectedOutput: "Reversed: madam, Palindrome: YES", isHidden: false, weight: 1 },
      { input: "code", expectedOutput: "Reversed: edoc, Palindrome: NO", isHidden: false, weight: 1 },
    ],
    referenceSolution: `#include <stdio.h>
#include <string.h>

int main(void) {
    char str[100];
    if (scanf("%s", str) != 1) return 0;
    int len = (int)strlen(str);
    char rev[100];
    int isPal = 1;
    for (int i = 0; i < len; i++) {
        rev[i] = str[len - 1 - i];
        if (str[i] != str[len - 1 - i]) isPal = 0;
    }
    rev[len] = '\\0';
    printf("Reversed: %s, Palindrome: %s\\n", rev, isPal ? "YES" : "NO");
    return 0;
}`,
    hints: ["Build rev[i] = str[len - 1 - i] and null-terminate rev[len] = '\\0'."],
  },

  // Program 4.2: Word Counter
  {
    id: "c_4_2",
    course: "c",
    chapterOrder: 4,
    programIndex: 1,
    title: "Program B: Word Counter in Sentence",
    difficulty: "EASY",
    objective: "Parse tokens separated by spaces from standard input.",
    description: "Read a line of text. Count the total number of words (sequences of non-whitespace characters). Print `Word Count: <count>`.",
    starterCode: `#include <stdio.h>

int main(void) {
    // Count words in line
    return 0;
}`,
    constraints: ["Line length <= 500 characters"],
    examples: [
      { input: "The quick brown fox", output: "Word Count: 4" },
    ],
    testCases: [
      { input: "The quick brown fox", expectedOutput: "Word Count: 4", isHidden: false, weight: 1 },
      { input: "Hello", expectedOutput: "Word Count: 1", isHidden: false, weight: 1 },
      { input: "KnowledgeStream AI Programming Mastery", expectedOutput: "Word Count: 4", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <stdio.h>
#include <ctype.h>

int main(void) {
    char line[512];
    if (!fgets(line, sizeof(line), stdin)) return 0;
    int words = 0;
    int inWord = 0;
    for (int i = 0; line[i] != '\\0'; i++) {
        if (!isspace((unsigned char)line[i])) {
            if (!inWord) {
                words++;
                inWord = 1;
            }
        } else {
            inWord = 0;
        }
    }
    printf("Word Count: %d\\n", words);
    return 0;
}`,
    hints: ["Use a boolean inWord state flag toggled by isspace()."],
  },

  // Chapter 5: Pointers
  {
    id: "c_5_1",
    course: "c",
    chapterOrder: 5,
    programIndex: 0,
    title: "Pointer Value Swap",
    difficulty: "EASY",
    objective: "Understand pass-by-pointer and memory dereferencing in C.",
    description: "Implement function `void swap(int *a, int *b)`. Read integers `x` and `y`. Call swap(&x, &y). Print: `After Swap: <x> <y>`.",
    starterCode: `#include <stdio.h>

void swap(int *a, int *b) {
    // Dereference and swap
}

int main(void) {
    int x, y;
    // Read and swap
    return 0;
}`,
    constraints: ["Integer inputs"],
    examples: [
      { input: "10 20", output: "After Swap: 20 10" },
    ],
    testCases: [
      { input: "10 20", expectedOutput: "After Swap: 20 10", isHidden: false, weight: 1 },
      { input: "-5 99", expectedOutput: "After Swap: 99 -5", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <stdio.h>

void swap(int *a, int *b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

int main(void) {
    int x, y;
    if (scanf("%d %d", &x, &y) == 2) {
        swap(&x, &y);
        printf("After Swap: %d %d\\n", x, y);
    }
    return 0;
}`,
    hints: ["Use *a to access the memory location pointed to by a."],
  },

  // Chapter 6: Dynamic Memory
  {
    id: "c_6_1",
    course: "c",
    chapterOrder: 6,
    programIndex: 0,
    title: "Dynamic Array Allocation with malloc and free",
    difficulty: "MEDIUM",
    objective: "Allocate heap memory with malloc, populate, and free.",
    description: "Read integer `n` followed by `n` integers. Allocate heap memory using `malloc(n * sizeof(int))`. Multiply each element by 2, print space-separated, and free memory.",
    starterCode: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    // Allocate, multiply by 2, print, free
    return 0;
}`,
    constraints: ["1 <= n <= 100", "Must call free()"],
    examples: [
      { input: "3\n1 2 3", output: "2 4 6" },
    ],
    testCases: [
      { input: "3\n1 2 3", expectedOutput: "2 4 6", isHidden: false, weight: 1 },
      { input: "4\n5 10 15 20", expectedOutput: "10 20 30 40", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    int *arr = (int *)malloc(n * sizeof(int));
    if (!arr) return 1;
    for (int i = 0; i < n; i++) {
        scanf("%d", &arr[i]);
        arr[i] *= 2;
    }
    for (int i = 0; i < n; i++) {
        printf("%d%s", arr[i], (i == n - 1) ? "" : " ");
    }
    printf("\\n");
    free(arr);
    return 0;
}`,
    hints: ["Remember to call free(arr) after printing."],
  },

  // Chapter 7: Structures & Unions
  {
    id: "c_7_1",
    course: "c",
    chapterOrder: 7,
    programIndex: 0,
    title: "Student Record Structure with GPA",
    difficulty: "EASY",
    objective: "Define and populate a C struct.",
    description: "Define struct `Student` with `name` (string) and `gpa` (float). Read name and gpa. Print: `Student: <name>, GPA: <gpa>` with GPA formatted to 2 decimal places.",
    starterCode: `#include <stdio.h>

struct Student {
    char name[50];
    float gpa;
};

int main(void) {
    // Read and print
    return 0;
}`,
    constraints: ["Name <= 49 characters, GPA between 0.0 and 4.0"],
    examples: [
      { input: "Alex 3.85", output: "Student: Alex, GPA: 3.85" },
    ],
    testCases: [
      { input: "Alex 3.85", expectedOutput: "Student: Alex, GPA: 3.85", isHidden: false, weight: 1 },
      { input: "Jordan 4.00", expectedOutput: "Student: Jordan, GPA: 4.00", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <stdio.h>

struct Student {
    char name[50];
    float gpa;
};

int main(void) {
    struct Student s;
    if (scanf("%s %f", s.name, &s.gpa) == 2) {
        printf("Student: %s, GPA: %.2f\\n", s.name, s.gpa);
    }
    return 0;
}`,
    hints: ["Access struct members using the dot operator: s.name, s.gpa."],
  },

  // Chapter 8: File Handling
  {
    id: "c_8_1",
    course: "c",
    chapterOrder: 8,
    programIndex: 0,
    title: "Line and Character Counter",
    difficulty: "EASY",
    objective: "Process stream characters until EOF.",
    description: "Read input text until EOF. Count the total characters and total lines (newline characters `\\n`). Print: `Chars: <chars>, Lines: <lines>`.",
    starterCode: `#include <stdio.h>

int main(void) {
    // Count chars and lines
    return 0;
}`,
    constraints: ["Input stream terminated by EOF"],
    examples: [
      { input: "Hello\nWorld\n", output: "Chars: 12, Lines: 2" },
    ],
    testCases: [
      { input: "Hello\nWorld\n", expectedOutput: "Chars: 12, Lines: 2", isHidden: false, weight: 1 },
      { input: "Line1\n", expectedOutput: "Chars: 6, Lines: 1", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <stdio.h>

int main(void) {
    int ch;
    int chars = 0, lines = 0;
    while ((ch = getchar()) != EOF) {
        chars++;
        if (ch == '\\n') lines++;
    }
    printf("Chars: %d, Lines: %d\\n", chars, lines);
    return 0;
}`,
    hints: ["Use while ((ch = getchar()) != EOF) to read all stream characters."],
  },

  // Chapter 9: Advanced C
  {
    id: "c_9_1",
    course: "c",
    chapterOrder: 9,
    programIndex: 0,
    title: "Bitwise Flag Manipulation",
    difficulty: "MEDIUM",
    objective: "Master bitwise operations: SET, CLEAR, and CHECK.",
    description: "Read an integer `val`, followed by bit position `k` (0-indexed). Compute:\n1. Setting bit `k`: `val | (1 << k)`\n2. Clearing bit `k`: `val & ~(1 << k)`\n3. Checking bit `k`: `(val >> k) & 1`\nPrint: `Set: <val>, Clear: <val>, IsSet: <val>`.",
    starterCode: `#include <stdio.h>

int main(void) {
    int val, k;
    // Perform bit operations
    return 0;
}`,
    constraints: ["0 <= k <= 30"],
    examples: [
      { input: "5 1", output: "Set: 7, Clear: 5, IsSet: 0" },
    ],
    testCases: [
      { input: "5 1", expectedOutput: "Set: 7, Clear: 5, IsSet: 0", isHidden: false, weight: 1 },
      { input: "8 3", expectedOutput: "Set: 8, Clear: 0, IsSet: 1", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <stdio.h>

int main(void) {
    int val, k;
    if (scanf("%d %d", &val, &k) == 2) {
        int setVal = val | (1 << k);
        int clearVal = val & ~(1 << k);
        int isSet = (val >> k) & 1;
        printf("Set: %d, Clear: %d, IsSet: %d\\n", setVal, clearVal, isSet);
    }
    return 0;
}`,
    hints: ["Set: val | (1 << k)", "Clear: val & ~(1 << k)", "Check: (val >> k) & 1"],
  },

  // Chapter 10: Revision & Interview Prep
  {
    id: "c_10_1",
    course: "c",
    chapterOrder: 10,
    programIndex: 0,
    title: "Target Two-Sum Search Algorithm",
    difficulty: "MEDIUM",
    objective: "Find two array elements adding to target.",
    description: "Read `n` followed by `n` integers and target `t`. Find the 0-based indices `i` and `j` (i < j) such that `arr[i] + arr[j] == t`. Print `Indices: <i> <j>`. If none, print `Indices: -1 -1`.",
    starterCode: `#include <stdio.h>

int main(void) {
    int n;
    // Find two sum
    return 0;
}`,
    constraints: ["2 <= n <= 100"],
    examples: [
      { input: "4\n2 7 11 15\n9", output: "Indices: 0 1" },
    ],
    testCases: [
      { input: "4\n2 7 11 15\n9", expectedOutput: "Indices: 0 1", isHidden: false, weight: 1 },
      { input: "3\n1 2 3\n10", expectedOutput: "Indices: -1 -1", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 2) return 0;
    int arr[100];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    int target;
    scanf("%d", &target);
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (arr[i] + arr[j] == target) {
                printf("Indices: %d %d\\n", i, j);
                return 0;
            }
        }
    }
    printf("Indices: -1 -1\\n");
    return 0;
}`,
    hints: ["Use nested loops i from 0..n and j from i+1..n to compare sums."],
  },
];
