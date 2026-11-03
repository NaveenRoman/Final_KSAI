import { ProgrammingChallenge } from "./types";

export const JAVA_CHALLENGES: ProgrammingChallenge[] = [
  // Chapter 1: Introduction to Java & Bytecode
  {
    id: "java_1_1",
    course: "java",
    chapterOrder: 1,
    programIndex: 0,
    title: "JVM Environment & Platform Info",
    difficulty: "EASY",
    objective: "Verify JDK class structure, JVM property inspection, and basic formatted console output.",
    description: "Write a canonical Java class named `Main` that prints: `KnowledgeStream Java Environment Ready` to standard output.",
    starterCode: `public class Main {
    public static void main(String[] args) {
        // Print the welcome message
    }
}`,
    constraints: ["Must use canonical public class Main", "Must terminate with status code 0"],
    examples: [
      { input: "", output: "KnowledgeStream Java Environment Ready" },
    ],
    testCases: [
      { input: "", expectedOutput: "KnowledgeStream Java Environment Ready", isHidden: false, weight: 1 },
    ],
    referenceSolution: `public class Main {
    public static void main(String[] args) {
        System.out.println("KnowledgeStream Java Environment Ready");
    }
}`,
    hints: [
      "Use System.out.println() to print the text.",
      "Check spelling and capitalization carefully.",
    ],
  },

  // Chapter 2: First Java Program & Architecture (Exp 3a adapted)
  {
    id: "java_2_1",
    course: "java",
    chapterOrder: 2,
    programIndex: 0,
    title: "Standard Console Output & Greetings",
    difficulty: "EASY",
    objective: "Read standard input using Scanner and print formatted output.",
    description: "Read a user's name from standard input and print: `Hello, <name>! Welcome to Java Programming.`",
    starterCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Read name and print formatted greeting
    }
}`,
    constraints: ["Read single token or line using Scanner", "Trim any excess whitespace"],
    examples: [
      { input: "Alice", output: "Hello, Alice! Welcome to Java Programming." },
    ],
    testCases: [
      { input: "Alice", expectedOutput: "Hello, Alice! Welcome to Java Programming.", isHidden: false, weight: 1 },
      { input: "Developer", expectedOutput: "Hello, Developer! Welcome to Java Programming.", isHidden: true, weight: 1 },
    ],
    referenceSolution: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNext()) {
            String name = sc.next();
            System.out.println("Hello, " + name + "! Welcome to Java Programming.");
        }
    }
}`,
    hints: ["Use sc.next() or sc.nextLine() to read the name.", "Concatenate with the exact required string."],
  },

  // Chapter 3: Variables, Data Types & Control Flow (Multi-Program: 3 Programs)
  // Program 3.1: Exp 1 - Even numbers loop
  {
    id: "java_3_1",
    course: "java",
    chapterOrder: 3,
    programIndex: 0,
    title: "Program A: Even Number Range Filter",
    difficulty: "EASY",
    objective: "Implement a for loop with conditional branching to print even numbers.",
    description: "Read two integers `a` and `b` (where a <= b). Print all even numbers in the range [a, b] inclusive, separated by spaces on a single line.",
    starterCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        // Print even numbers separated by space
    }
}`,
    constraints: ["1 <= a <= b <= 1000", "Numbers must be separated by a single space"],
    examples: [
      { input: "1 10", output: "2 4 6 8 10" },
    ],
    testCases: [
      { input: "1 10", expectedOutput: "2 4 6 8 10", isHidden: false, weight: 1 },
      { input: "10 20", expectedOutput: "10 12 14 16 18 20", isHidden: true, weight: 1 },
      { input: "3 3", expectedOutput: "", isHidden: true, weight: 1 },
    ],
    referenceSolution: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        StringBuilder sb = new StringBuilder();
        for (int i = a; i <= b; i++) {
            if (i % 2 == 0) {
                if (sb.length() > 0) sb.append(" ");
                sb.append(i);
            }
        }
        System.out.println(sb.toString());
    }
}`,
    hints: ["Use i % 2 == 0 to detect even numbers.", "Use a StringBuilder or trim trailing spaces."],
  },

  // Program 3.2: Exp 3b - Factorial
  {
    id: "java_3_2",
    course: "java",
    chapterOrder: 3,
    programIndex: 1,
    title: "Program B: Factorial Calculation",
    difficulty: "EASY",
    objective: "Compute the factorial of an integer, handling edge cases.",
    description: "Read an integer `n`. If `n < 0`, print `Invalid input`. If `n >= 0`, calculate and print `n!`.",
    starterCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        // Compute factorial or handle invalid input
    }
}`,
    constraints: ["-10 <= n <= 15"],
    examples: [
      { input: "5", output: "120" },
      { input: "-2", output: "Invalid input" },
    ],
    testCases: [
      { input: "5", expectedOutput: "120", isHidden: false, weight: 1 },
      { input: "0", expectedOutput: "1", isHidden: false, weight: 1 },
      { input: "-3", expectedOutput: "Invalid input", isHidden: true, weight: 1 },
      { input: "6", expectedOutput: "720", isHidden: true, weight: 1 },
    ],
    referenceSolution: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        if (n < 0) {
            System.out.println("Invalid input");
            return;
        }
        long fact = 1;
        for (int i = 2; i <= n; i++) {
            fact *= i;
        }
        System.out.println(fact);
    }
}`,
    hints: ["0! is defined as 1.", "Handle negative inputs with a check."],
  },

  // Program 3.3: Exp 7 - Traffic light state dispatcher
  {
    id: "java_3_3",
    course: "java",
    chapterOrder: 3,
    programIndex: 2,
    title: "Program C: Traffic Light Dispatcher",
    difficulty: "EASY",
    objective: "Implement switch/case decision logic.",
    description: "Read a traffic light color (case-insensitive: `red`, `yellow`, `green`). Print:\n- `STOP` for red\n- `READY` for yellow\n- `GO` for green\n- `INVALID` for any other input.",
    starterCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String color = sc.next();
        // Dispatch traffic signal
    }
}`,
    constraints: ["Input is a single string"],
    examples: [
      { input: "Red", output: "STOP" },
      { input: "green", output: "GO" },
    ],
    testCases: [
      { input: "Red", expectedOutput: "STOP", isHidden: false, weight: 1 },
      { input: "yellow", expectedOutput: "READY", isHidden: false, weight: 1 },
      { input: "GREEN", expectedOutput: "GO", isHidden: true, weight: 1 },
      { input: "blue", expectedOutput: "INVALID", isHidden: true, weight: 1 },
    ],
    referenceSolution: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String color = sc.next().toLowerCase();
        switch (color) {
            case "red":
                System.out.println("STOP");
                break;
            case "yellow":
                System.out.println("READY");
                break;
            case "green":
                System.out.println("GO");
                break;
            default:
                System.out.println("INVALID");
                break;
        }
    }
}`,
    hints: ["Use .toLowerCase() on the string before matching in switch."],
  },

  // Chapter 4: Principles of OOPs (Exp 8 base class modeling)
  {
    id: "java_4_1",
    course: "java",
    chapterOrder: 4,
    programIndex: 0,
    title: "Employee Class Modeling & Salary",
    difficulty: "EASY",
    objective: "Implement a class with instance variables, constructor, and method.",
    description: "Create an `Employee` class that takes `name` (String), `baseSalary` (double), and `bonus` (double). Print `Employee: <name>, Total Salary: <base + bonus>` formatted as an integer if whole.",
    starterCode: `import java.util.Scanner;

class Employee {
    String name;
    double baseSalary;
    double bonus;

    // Constructor & method
}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String name = sc.next();
        double base = sc.nextDouble();
        double bonus = sc.nextDouble();
        // Instantiate and display
    }
}`,
    constraints: ["Salaries are non-negative doubles"],
    examples: [
      { input: "John 50000 7500", output: "Employee: John, Total Salary: 57500" },
    ],
    testCases: [
      { input: "John 50000 7500", expectedOutput: "Employee: John, Total Salary: 57500", isHidden: false, weight: 1 },
      { input: "Sarah 80000 12000", expectedOutput: "Employee: Sarah, Total Salary: 92000", isHidden: true, weight: 1 },
    ],
    referenceSolution: `import java.util.Scanner;

class Employee {
    String name;
    double baseSalary;
    double bonus;

    Employee(String name, double baseSalary, double bonus) {
        this.name = name;
        this.baseSalary = baseSalary;
        this.bonus = bonus;
    }

    double getTotalSalary() {
        return baseSalary + bonus;
    }
}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String name = sc.next();
        double base = sc.nextDouble();
        double bonus = sc.nextDouble();
        Employee emp = new Employee(name, base, bonus);
        long total = (long) emp.getTotalSalary();
        System.out.println("Employee: " + emp.name + ", Total Salary: " + total);
    }
}`,
    hints: ["Create an Employee constructor.", "Cast total to long or format as required."],
  },

  // Chapter 5: Constructors, Design Patterns & Keywords (Exp 10 adapter pattern)
  {
    id: "java_5_1",
    course: "java",
    chapterOrder: 5,
    programIndex: 0,
    title: "Event Adapter & Constructor Chaining",
    difficulty: "MEDIUM",
    objective: "Implement constructor chaining using this().",
    description: "Implement an `EventListener` class with overloaded constructors: `EventListener(String eventType)` chains to `EventListener(String eventType, String handler)` with a default handler of `DefaultHandler`. Print `Event: <eventType>, Handler: <handler>, Status: ACTIVE`.",
    starterCode: `import java.util.Scanner;

class EventListener {
    // Implement fields and constructor chaining
}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String type = sc.next();
        String handler = sc.hasNext() ? sc.next() : null;
        // Instantiate and print
    }
}`,
    constraints: ["Event types: CLICK, HOVER, KEYPRESS"],
    examples: [
      { input: "CLICK MouseHandler", output: "Event: CLICK, Handler: MouseHandler, Status: ACTIVE" },
      { input: "HOVER", output: "Event: HOVER, Handler: DefaultHandler, Status: ACTIVE" },
    ],
    testCases: [
      { input: "CLICK MouseHandler", expectedOutput: "Event: CLICK, Handler: MouseHandler, Status: ACTIVE", isHidden: false, weight: 1 },
      { input: "HOVER", expectedOutput: "Event: HOVER, Handler: DefaultHandler, Status: ACTIVE", isHidden: false, weight: 1 },
    ],
    referenceSolution: `import java.util.Scanner;

class EventListener {
    String eventType;
    String handler;

    EventListener(String eventType) {
        this(eventType, "DefaultHandler");
    }

    EventListener(String eventType, String handler) {
        this.eventType = eventType;
        this.handler = handler;
    }

    void display() {
        System.out.println("Event: " + eventType + ", Handler: " + handler + ", Status: ACTIVE");
    }
}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String type = sc.next();
        EventListener listener;
        if (sc.hasNext()) {
            String handler = sc.next();
            listener = new EventListener(type, handler);
        } else {
            listener = new EventListener(type);
        }
        listener.display();
    }
}`,
    hints: ["Use this(eventType, \"DefaultHandler\") in the single-argument constructor."],
  },

  // Chapter 6: Polymorphism & Method Binding (Exp 8 overriding)
  {
    id: "java_6_1",
    course: "java",
    chapterOrder: 6,
    programIndex: 0,
    title: "Dynamic Method Dispatch with Shapes",
    difficulty: "MEDIUM",
    objective: "Demonstrate method overriding and polymorphic dispatch.",
    description: "Create a base class `Shape` with method `double area()`. Derive `Rectangle` (w * h) and `Triangle` (0.5 * w * h). Read `shapeType` (rectangle or triangle) followed by dimensions `w` and `h`. Print `Area: <result>` formatted to 1 decimal place.",
    starterCode: `import java.util.Scanner;

class Shape {
    double area() { return 0.0; }
}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String type = sc.next();
        double w = sc.nextDouble();
        double h = sc.nextDouble();
        // Polymorphic call
    }
}`,
    constraints: ["w, h > 0"],
    examples: [
      { input: "rectangle 4 5", output: "Area: 20.0" },
      { input: "triangle 6 3", output: "Area: 9.0" },
    ],
    testCases: [
      { input: "rectangle 4 5", expectedOutput: "Area: 20.0", isHidden: false, weight: 1 },
      { input: "triangle 6 3", expectedOutput: "Area: 9.0", isHidden: false, weight: 1 },
      { input: "rectangle 10 2.5", expectedOutput: "Area: 25.0", isHidden: true, weight: 1 },
    ],
    referenceSolution: `import java.util.Scanner;

class Shape {
    double area() { return 0.0; }
}

class Rectangle extends Shape {
    double w, h;
    Rectangle(double w, double h) { this.w = w; this.h = h; }
    @Override double area() { return w * h; }
}

class Triangle extends Shape {
    double w, h;
    Triangle(double w, double h) { this.w = w; this.h = h; }
    @Override double area() { return 0.5 * w * h; }
}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String type = sc.next().toLowerCase();
        double w = sc.nextDouble();
        double h = sc.nextDouble();
        Shape s = type.equals("rectangle") ? new Rectangle(w, h) : new Triangle(w, h);
        System.out.println(String.format("Area: %.1f", s.area()));
    }
}`,
    hints: ["Use @Override on derived methods.", "Format output with String.format(\"Area: %.1f\", s.area())."],
  },

  // Chapter 7: Abstraction (Multi-Program: 2 Programs)
  // Program 7.1: Exp 8 - Abstract Shape Hierarchy
  {
    id: "java_7_1",
    course: "java",
    chapterOrder: 7,
    programIndex: 0,
    title: "Program A: Shape Abstract Hierarchy",
    difficulty: "MEDIUM",
    objective: "Define and extend an abstract class with abstract methods.",
    description: "Define abstract class `Shape` with abstract method `void printArea()`. Derive `Rectangle(int w, int h)` and `Circle(int r)` (use 3.14 for pi). Read `type` (`rectangle` or `circle`) followed by dimensions. Print area to standard output.",
    starterCode: `import java.util.Scanner;

abstract class Shape {
    abstract void printArea();
}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String type = sc.next();
        // Implement and execute
    }
}`,
    constraints: ["Dimensions are positive integers", "Pi is 3.14"],
    examples: [
      { input: "rectangle 10 5", output: "Rectangle Area: 50.0" },
      { input: "circle 5", output: "Circle Area: 78.5" },
    ],
    testCases: [
      { input: "rectangle 10 5", expectedOutput: "Rectangle Area: 50.0", isHidden: false, weight: 1 },
      { input: "circle 5", expectedOutput: "Circle Area: 78.5", isHidden: false, weight: 1 },
      { input: "circle 10", expectedOutput: "Circle Area: 314.0", isHidden: true, weight: 1 },
    ],
    referenceSolution: `import java.util.Scanner;

abstract class Shape {
    abstract void printArea();
}

class Rectangle extends Shape {
    int w, h;
    Rectangle(int w, int h) { this.w = w; this.h = h; }
    void printArea() {
        System.out.println(String.format("Rectangle Area: %.1f", (double)(w * h)));
    }
}

class Circle extends Shape {
    int r;
    Circle(int r) { this.r = r; }
    void printArea() {
        System.out.println(String.format("Circle Area: %.1f", 3.14 * r * r));
    }
}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String type = sc.next().toLowerCase();
        if (type.equals("rectangle")) {
            int w = sc.nextInt();
            int h = sc.nextInt();
            new Rectangle(w, h).printArea();
        } else {
            int r = sc.nextInt();
            new Circle(r).printArea();
        }
    }
}`,
    hints: ["Abstract methods have no body in the base class.", "Subclasses must implement all abstract methods."],
  },

  // Program 7.2: Addl Exp 4 - Multiple Interface Implementation
  {
    id: "java_7_2",
    course: "java",
    chapterOrder: 7,
    programIndex: 1,
    title: "Program B: Multiple Interface Implementation",
    difficulty: "MEDIUM",
    objective: "Implement multiple interfaces in a single Java class.",
    description: "Define interfaces `Readable` (method `readData()`) and `Writable` (method `writeData(String s)`). Implement both in class `DocumentManager`. Read command `READ` or `WRITE <text>`. Print `Reading: <text>` or `Writing: <text>`.",
    starterCode: `import java.util.Scanner;

interface Readable {
    void readData(String text);
}

interface Writable {
    void writeData(String text);
}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String command = sc.next();
        String text = sc.nextLine().trim();
        // Implement and execute
    }
}`,
    constraints: ["Commands: READ or WRITE"],
    examples: [
      { input: "WRITE Document content", output: "Writing: Document content" },
      { input: "READ Chapter 7 notes", output: "Reading: Chapter 7 notes" },
    ],
    testCases: [
      { input: "WRITE Document content", expectedOutput: "Writing: Document content", isHidden: false, weight: 1 },
      { input: "READ Chapter 7 notes", expectedOutput: "Reading: Chapter 7 notes", isHidden: false, weight: 1 },
    ],
    referenceSolution: `import java.util.Scanner;

interface Readable {
    void readData(String text);
}

interface Writable {
    void writeData(String text);
}

class DocumentManager implements Readable, Writable {
    public void readData(String text) {
        System.out.println("Reading: " + text);
    }
    public void writeData(String text) {
        System.out.println("Writing: " + text);
    }
}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String command = sc.next().toUpperCase();
        String text = sc.nextLine().trim();
        DocumentManager dm = new DocumentManager();
        if (command.equals("WRITE")) {
            dm.writeData(text);
        } else {
            dm.readData(text);
        }
    }
}`,
    hints: ["A class can implement multiple interfaces separated by commas."],
  },

  // Chapter 8: Packages & Encapsulation
  {
    id: "java_8_1",
    course: "java",
    chapterOrder: 8,
    programIndex: 0,
    title: "Encapsulated Account with Validation",
    difficulty: "EASY",
    objective: "Apply encapsulation with private fields, getters, and setters that enforce business rules.",
    description: "Create an encapsulated `BankAccount` class with private `balance`. Provide `deposit(double amount)` which rejects non-positive amounts with `Error: Deposit must be positive`. Otherwise print `Balance: <balance>`.",
    starterCode: `import java.util.Scanner;

class BankAccount {
    private double balance = 0.0;
    // Getters, setters, and deposit validation
}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        double amt = sc.nextDouble();
        // Perform deposit
    }
}`,
    constraints: ["Balance starts at 0.0"],
    examples: [
      { input: "150", output: "Balance: 150.0" },
      { input: "-20", output: "Error: Deposit must be positive" },
    ],
    testCases: [
      { input: "150", expectedOutput: "Balance: 150.0", isHidden: false, weight: 1 },
      { input: "-20", expectedOutput: "Error: Deposit must be positive", isHidden: false, weight: 1 },
      { input: "0", expectedOutput: "Error: Deposit must be positive", isHidden: true, weight: 1 },
    ],
    referenceSolution: `import java.util.Scanner;

class BankAccount {
    private double balance = 0.0;

    public boolean deposit(double amount) {
        if (amount <= 0) {
            return false;
        }
        balance += amount;
        return true;
    }

    public double getBalance() {
        return balance;
    }
}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        double amt = sc.nextDouble();
        BankAccount acc = new BankAccount();
        if (acc.deposit(amt)) {
            System.out.println(String.format("Balance: %.1f", acc.getBalance()));
        } else {
            System.out.println("Error: Deposit must be positive");
        }
    }
}`,
    hints: ["Keep the balance private and check amount > 0 inside deposit()."],
  },

  // Chapter 9: Arrays & Sorting (Multi-Program: 2 Programs)
  // Program 9.1: Exp 15 - Descending Bubble Sort with Swap Counter
  {
    id: "java_9_1",
    course: "java",
    chapterOrder: 9,
    programIndex: 0,
    title: "Program A: Descending Bubble Sort with Swap Counter",
    difficulty: "MEDIUM",
    objective: "Implement bubble sort in descending order and count total element swaps.",
    description: "Read integer `n` followed by `n` integers. Sort the array in descending order using Bubble Sort. Output the sorted array space-separated on line 1, and `Swaps: <count>` on line 2.",
    starterCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] arr = new int[n];
        for (int i = 0; i < n; i++) arr[i] = sc.nextInt();
        // Implement descending bubble sort and count swaps
    }
}`,
    constraints: ["1 <= n <= 100"],
    examples: [
      { input: "5\n5 1 4 2 8", output: "8 5 4 2 1\nSwaps: 7" },
    ],
    testCases: [
      { input: "5\n5 1 4 2 8", expectedOutput: "8 5 4 2 1\nSwaps: 7", isHidden: false, weight: 1 },
      { input: "4\n1 2 3 4", expectedOutput: "4 3 2 1\nSwaps: 6", isHidden: true, weight: 1 },
      { input: "3\n9 5 2", expectedOutput: "9 5 2\nSwaps: 0", isHidden: true, weight: 1 },
    ],
    referenceSolution: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] arr = new int[n];
        for (int i = 0; i < n; i++) arr[i] = sc.nextInt();
        
        int swaps = 0;
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - 1 - i; j++) {
                if (arr[j] < arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                    swaps++;
                }
            }
        }
        
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) {
            if (i > 0) sb.append(" ");
            sb.append(arr[i]);
        }
        System.out.println(sb.toString());
        System.out.println("Swaps: " + swaps);
    }
}`,
    hints: ["In descending sort, swap if arr[j] < arr[j+1]. Increment swap counter on each exchange."],
  },

  // Program 9.2: Exp 14 - Quick Sort on String Array
  {
    id: "java_9_2",
    course: "java",
    chapterOrder: 9,
    programIndex: 1,
    title: "Program B: Quick Sort on String Array",
    difficulty: "HARD",
    objective: "Implement Quick Sort partitioning on strings using compareTo.",
    description: "Read integer `n` followed by `n` names. Sort the names in alphabetical order using Quick Sort. Print the sorted names separated by spaces on a single line.",
    starterCode: `import java.util.Scanner;

public class Main {
    // Quick Sort on String array
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        String[] names = new String[n];
        for (int i = 0; i < n; i++) names[i] = sc.next();
        // Sort and print
    }
}`,
    constraints: ["1 <= n <= 50"],
    examples: [
      { input: "4\nZara Bob Alice Charlie", output: "Alice Bob Charlie Zara" },
    ],
    testCases: [
      { input: "4\nZara Bob Alice Charlie", expectedOutput: "Alice Bob Charlie Zara", isHidden: false, weight: 1 },
      { input: "3\nGamma Beta Alpha", expectedOutput: "Alpha Beta Gamma", isHidden: true, weight: 1 },
    ],
    referenceSolution: `import java.util.Scanner;

public class Main {
    static void quickSort(String[] arr, int low, int high) {
        if (low < high) {
            int pi = partition(arr, low, high);
            quickSort(arr, low, pi - 1);
            quickSort(arr, pi + 1, high);
        }
    }

    static int partition(String[] arr, int low, int high) {
        String pivot = arr[high];
        int i = low - 1;
        for (int j = low; j < high; j++) {
            if (arr[j].compareToIgnoreCase(pivot) <= 0) {
                i++;
                String temp = arr[i];
                arr[i] = arr[j];
                arr[j] = temp;
            }
        }
        String temp = arr[i + 1];
        arr[i + 1] = arr[high];
        arr[high] = temp;
        return i + 1;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        String[] names = new String[n];
        for (int i = 0; i < n; i++) names[i] = sc.next();
        quickSort(names, 0, n - 1);
        System.out.println(String.join(" ", names));
    }
}`,
    hints: ["Use arr[j].compareToIgnoreCase(pivot) <= 0 for alphabetical ordering."],
  },

  // Chapter 10: String Handling
  {
    id: "java_10_1",
    course: "java",
    chapterOrder: 10,
    programIndex: 0,
    title: "String Palindrome & Normalizer",
    difficulty: "EASY",
    objective: "Practice String methods and immutability.",
    description: "Read a string from standard input. Remove all whitespace and convert to lowercase. Check if the string is a palindrome. Print `PALINDROME` or `NOT PALINDROME`.",
    starterCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.nextLine();
        // Normalize and test palindrome
    }
}`,
    constraints: ["1 <= string length <= 500"],
    examples: [
      { input: "radar", output: "PALINDROME" },
      { input: "hello", output: "NOT PALINDROME" },
      { input: "Race car", output: "PALINDROME" },
    ],
    testCases: [
      { input: "radar", expectedOutput: "PALINDROME", isHidden: false, weight: 1 },
      { input: "hello", expectedOutput: "NOT PALINDROME", isHidden: false, weight: 1 },
      { input: "Race car", expectedOutput: "PALINDROME", isHidden: true, weight: 1 },
    ],
    referenceSolution: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.nextLine().replaceAll("\\\\s+", "").toLowerCase();
        String rev = new StringBuilder(s).reverse().toString();
        if (s.equals(rev)) {
            System.out.println("PALINDROME");
        } else {
            System.out.println("NOT PALINDROME");
        }
    }
}`,
    hints: ["Use s.replaceAll(\"\\\\s+\", \"\").toLowerCase() to strip spaces and lower case.", "Compare with StringBuilder(s).reverse().toString()."],
  },

  // Chapter 11: Exception Handling (Multi-Program: 2 Programs)
  // Program 11.1: Exp 4 - Integer division with exception trapping
  {
    id: "java_11_1",
    course: "java",
    chapterOrder: 11,
    programIndex: 0,
    title: "Program A: Integer Division with Exception Trapping",
    difficulty: "EASY",
    objective: "Trap NumberFormatException and ArithmeticException in division.",
    description: "Read two tokens `num1` and `num2` as strings. Parse both as integers. If non-numeric, print `Error: Invalid integer format`. If division by zero occurs, print `Error: Division by zero`. Otherwise print `Result: <num1 / num2>`.",
    starterCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s1 = sc.next();
        String s2 = sc.next();
        // Handle NumberFormatException and ArithmeticException
    }
}`,
    constraints: ["Input tokens are strings up to 20 chars"],
    examples: [
      { input: "10 2", output: "Result: 5" },
      { input: "10 0", output: "Error: Division by zero" },
      { input: "10 abc", output: "Error: Invalid integer format" },
    ],
    testCases: [
      { input: "10 2", expectedOutput: "Result: 5", isHidden: false, weight: 1 },
      { input: "10 0", expectedOutput: "Error: Division by zero", isHidden: false, weight: 1 },
      { input: "10 abc", expectedOutput: "Error: Invalid integer format", isHidden: false, weight: 1 },
      { input: "xyz 5", expectedOutput: "Error: Invalid integer format", isHidden: true, weight: 1 },
    ],
    referenceSolution: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s1 = sc.next();
        String s2 = sc.next();
        try {
            int a = Integer.parseInt(s1);
            int b = Integer.parseInt(s2);
            int res = a / b;
            System.out.println("Result: " + res);
        } catch (NumberFormatException e) {
            System.out.println("Error: Invalid integer format");
        } catch (ArithmeticException e) {
            System.out.println("Error: Division by zero");
        }
    }
}`,
    hints: ["Catch NumberFormatException when Integer.parseInt() fails.", "Catch ArithmeticException when dividing by 0."],
  },

  // Program 11.2: Exp 2 - Calculator with arithmetic safety
  {
    id: "java_11_2",
    course: "java",
    chapterOrder: 11,
    programIndex: 1,
    title: "Program B: Calculator with Arithmetic Safety",
    difficulty: "EASY",
    objective: "Implement a safe calculator evaluating operators (+, -, *, /, %).",
    description: "Read `a` (integer), `op` (string: +, -, *, /, %), and `b` (integer). Evaluate the operation. Catch division/modulo by zero and output `Error: Divide by zero`. Otherwise print the integer result.",
    starterCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        String op = sc.next();
        int b = sc.nextInt();
        // Compute safely
    }
}`,
    constraints: ["Supported operators: +, -, *, /, %"],
    examples: [
      { input: "15 + 7", output: "22" },
      { input: "20 / 0", output: "Error: Divide by zero" },
      { input: "10 * 3", output: "30" },
    ],
    testCases: [
      { input: "15 + 7", expectedOutput: "22", isHidden: false, weight: 1 },
      { input: "20 / 0", expectedOutput: "Error: Divide by zero", isHidden: false, weight: 1 },
      { input: "10 * 3", expectedOutput: "30", isHidden: false, weight: 1 },
      { input: "14 % 4", expectedOutput: "2", isHidden: true, weight: 1 },
      { input: "10 % 0", expectedOutput: "Error: Divide by zero", isHidden: true, weight: 1 },
    ],
    referenceSolution: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        String op = sc.next();
        int b = sc.nextInt();

        try {
            switch (op) {
                case "+": System.out.println(a + b); break;
                case "-": System.out.println(a - b); break;
                case "*": System.out.println(a * b); break;
                case "/": System.out.println(a / b); break;
                case "%": System.out.println(a % b); break;
                default: System.out.println("Error: Unknown operator"); break;
            }
        } catch (ArithmeticException e) {
            System.out.println("Error: Divide by zero");
        }
    }
}`,
    hints: ["Use a switch statement over op and wrap in try-catch."],
  },

  // Chapter 12: Multithreading (Exp 5 - Three-Thread Processor)
  {
    id: "java_12_1",
    course: "java",
    chapterOrder: 12,
    programIndex: 0,
    title: "Three-Thread Number Processor",
    difficulty: "MEDIUM",
    objective: "Implement multithreaded task coordination based on even/odd conditions.",
    description: "Read an integer `n` (number of items from 1 to n). For each number `i` from 1 to n: if `i` is even print `EVEN_SQUARE: <i*i>`, if odd print `ODD_CUBE: <i*i*i>`.",
    starterCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        // Process 1..n
    }
}`,
    constraints: ["1 <= n <= 20"],
    examples: [
      { input: "3", output: "ODD_CUBE: 1\nEVEN_SQUARE: 4\nODD_CUBE: 27" },
    ],
    testCases: [
      { input: "3", expectedOutput: "ODD_CUBE: 1\nEVEN_SQUARE: 4\nODD_CUBE: 27", isHidden: false, weight: 1 },
      { input: "4", expectedOutput: "ODD_CUBE: 1\nEVEN_SQUARE: 4\nODD_CUBE: 27\nEVEN_SQUARE: 16", isHidden: true, weight: 1 },
    ],
    referenceSolution: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        for (int i = 1; i <= n; i++) {
            if (i % 2 == 0) {
                System.out.println("EVEN_SQUARE: " + (i * i));
            } else {
                System.out.println("ODD_CUBE: " + (i * i * i));
            }
        }
    }
}`,
    hints: ["Check if i % 2 == 0 for even square, else odd cube."],
  },

  // Chapter 13: Synchronization & Concurrent Collections (Exp 12 - Producer-Consumer)
  {
    id: "java_13_1",
    course: "java",
    chapterOrder: 13,
    programIndex: 0,
    title: "Producer-Consumer Synchronization",
    difficulty: "HARD",
    objective: "Coordinate synchronized producer and consumer threads.",
    description: "Read integer `n`. Simulate a synchronous producer-consumer queue of capacity 1. For items 1 to n, sequentially print `Produced: <i>` followed by `Consumed: <i>`.",
    starterCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        // Synchronized producer-consumer flow
    }
}`,
    constraints: ["1 <= n <= 10"],
    examples: [
      { input: "2", output: "Produced: 1\nConsumed: 1\nProduced: 2\nConsumed: 2" },
    ],
    testCases: [
      { input: "2", expectedOutput: "Produced: 1\nConsumed: 1\nProduced: 2\nConsumed: 2", isHidden: false, weight: 1 },
      { input: "3", expectedOutput: "Produced: 1\nConsumed: 1\nProduced: 2\nConsumed: 2\nProduced: 3\nConsumed: 3", isHidden: true, weight: 1 },
    ],
    referenceSolution: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        for (int i = 1; i <= n; i++) {
            System.out.println("Produced: " + i);
            System.out.println("Consumed: " + i);
        }
    }
}`,
    hints: ["Alternating produce and consume pairs ensure thread-safe queue handoff."],
  },

  // Chapter 14: Collections Framework & Generics (Multi-Program: 2 Programs)
  // Program 14.1: Exp 11 - Phone directory with Hashtable
  {
    id: "java_14_1",
    course: "java",
    chapterOrder: 14,
    programIndex: 0,
    title: "Program A: Phone Directory with Hashtable",
    difficulty: "MEDIUM",
    objective: "Use Hashtable / Map for key-value storage and lookup.",
    description: "Read operations. `ADD <name> <phone>` inserts a contact. `GET <name>` looks up the contact. If not found, print `Not Found`. Input ends with `EXIT`.",
    starterCode: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        Hashtable<String, String> phoneBook = new Hashtable<>();
        // Process ADD, GET, EXIT commands
    }
}`,
    constraints: ["Names and phone numbers are alphanumeric strings without spaces"],
    examples: [
      { input: "ADD Alice 12345\nGET Alice\nEXIT", output: "12345" },
    ],
    testCases: [
      { input: "ADD Alice 12345\nGET Alice\nEXIT", expectedOutput: "12345", isHidden: false, weight: 1 },
      { input: "GET Unknown\nEXIT", expectedOutput: "Not Found", isHidden: false, weight: 1 },
      { input: "ADD Bob 99999\nADD Carol 88888\nGET Carol\nGET Bob\nEXIT", expectedOutput: "88888\n99999", isHidden: true, weight: 1 },
    ],
    referenceSolution: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        Hashtable<String, String> phoneBook = new Hashtable<>();
        while (sc.hasNext()) {
            String cmd = sc.next();
            if (cmd.equalsIgnoreCase("EXIT")) break;
            if (cmd.equalsIgnoreCase("ADD")) {
                String name = sc.next();
                String phone = sc.next();
                phoneBook.put(name, phone);
            } else if (cmd.equalsIgnoreCase("GET")) {
                String name = sc.next();
                String phone = phoneBook.get(name);
                System.out.println(phone != null ? phone : "Not Found");
            }
        }
    }
}`,
    hints: ["Use phoneBook.put(name, phone) and phoneBook.get(name)."],
  },

  // Program 14.2: Exp 6 - Doubly Linked List Node Deletion
  {
    id: "java_14_2",
    course: "java",
    chapterOrder: 14,
    programIndex: 1,
    title: "Program B: Doubly Linked List Node Deletion",
    difficulty: "HARD",
    objective: "Implement a Doubly Linked List with node deletion.",
    description: "Read `n` integers forming a linked list, followed by integer `val` to delete. Delete the first occurrence of `val`. Print the remaining elements separated by spaces.",
    starterCode: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        // Read list and delete target element
    }
}`,
    constraints: ["1 <= n <= 100"],
    examples: [
      { input: "5\n1 2 3 4 5\n3", output: "1 2 4 5" },
    ],
    testCases: [
      { input: "5\n1 2 3 4 5\n3", expectedOutput: "1 2 4 5", isHidden: false, weight: 1 },
      { input: "4\n10 20 30 40\n10", expectedOutput: "20 30 40", isHidden: true, weight: 1 },
    ],
    referenceSolution: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        LinkedList<Integer> list = new LinkedList<>();
        for (int i = 0; i < n; i++) list.add(sc.nextInt());
        int target = sc.nextInt();
        list.remove(Integer.valueOf(target));
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) sb.append(" ");
            sb.append(list.get(i));
        }
        System.out.println(sb.toString());
    }
}`,
    hints: ["Use LinkedList or custom Node with prev and next pointers."],
  },

  // Chapter 15: File I/O & Streams (Multi-Program: 2 Programs)
  // Program 15.1: Exp 9 - Delimited Table CSV Parser
  {
    id: "java_15_1",
    course: "java",
    chapterOrder: 15,
    programIndex: 0,
    title: "Program A: Delimited Table CSV Parser",
    difficulty: "MEDIUM",
    objective: "Parse delimited tabular data and compute aggregate metrics.",
    description: "Read `n` (number of rows) followed by `n` CSV lines of format `Name,Score`. Parse the lines and compute the total sum of scores. Print: `Rows: <n>, Total: <sum>`.",
    starterCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        // Parse CSV lines and compute total
    }
}`,
    constraints: ["1 <= n <= 50"],
    examples: [
      { input: "2\nAlice,40\nBob,60", output: "Rows: 2, Total: 100" },
    ],
    testCases: [
      { input: "2\nAlice,40\nBob,60", expectedOutput: "Rows: 2, Total: 100", isHidden: false, weight: 1 },
      { input: "3\nA,10\nB,20\nC,30", expectedOutput: "Rows: 3, Total: 60", isHidden: true, weight: 1 },
    ],
    referenceSolution: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = Integer.parseInt(sc.nextLine().trim());
        int total = 0;
        for (int i = 0; i < n; i++) {
            String line = sc.nextLine().trim();
            String[] parts = line.split(",");
            if (parts.length >= 2) {
                total += Integer.parseInt(parts[1].trim());
            }
        }
        System.out.println("Rows: " + n + ", Total: " + total);
    }
}`,
    hints: ["Use line.split(\",\") to extract name and score.", "Accumulate the scores with Integer.parseInt()."],
  },

  // Program 15.2: Exp 13 - File Path & Extension Extractor
  {
    id: "java_15_2",
    course: "java",
    chapterOrder: 15,
    programIndex: 1,
    title: "Program B: Path & File Extension Parser",
    difficulty: "EASY",
    objective: "Extract filename and file extension using path strings.",
    description: "Read a file path string (using forward slashes `/`). Extract and print the filename and extension in format: `File: <filename>, Extension: <ext>`.",
    starterCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String path = sc.next();
        // Extract filename and extension
    }
}`,
    constraints: ["Path contains at least one forward slash and one period"],
    examples: [
      { input: "/home/user/document.txt", output: "File: document.txt, Extension: txt" },
    ],
    testCases: [
      { input: "/home/user/document.txt", expectedOutput: "File: document.txt, Extension: txt", isHidden: false, weight: 1 },
      { input: "/var/log/system.log", expectedOutput: "File: system.log, Extension: log", isHidden: true, weight: 1 },
    ],
    referenceSolution: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String path = sc.next();
        int slashIdx = path.lastIndexOf('/');
        String filename = slashIdx >= 0 ? path.substring(slashIdx + 1) : path;
        int dotIdx = filename.lastIndexOf('.');
        String ext = dotIdx >= 0 ? filename.substring(dotIdx + 1) : "";
        System.out.println("File: " + filename + ", Extension: " + ext);
    }
}`,
    hints: ["Use lastIndexOf('/') to find the start of the file name.", "Use lastIndexOf('.') to find the extension."],
  },
];
