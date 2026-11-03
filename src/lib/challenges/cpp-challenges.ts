import { ProgrammingChallenge } from "./types";

export const CPP_CHALLENGES: ProgrammingChallenge[] = [
  // Chapter 1: Foundations & Toolchains
  {
    id: "cpp_1_1",
    course: "cpp",
    chapterOrder: 1,
    programIndex: 0,
    title: "Modern Console Geometry Area",
    difficulty: "EASY",
    objective: "Use std::cin and std::cout for formatted I/O in C++.",
    description: "Read width `w` and height `h` (doubles). Compute the area of a rectangle. Print: `Area: <w * h>` formatted to 2 decimal places using `<iomanip>`.",
    starterCode: `#include <iostream>
#include <iomanip>

int main() {
    double w, h;
    // Compute and print area
    return 0;
}`,
    constraints: ["w, h > 0"],
    examples: [
      { input: "4.5 2.0", output: "Area: 9.00" },
    ],
    testCases: [
      { input: "4.5 2.0", expectedOutput: "Area: 9.00", isHidden: false, weight: 1 },
      { input: "10 5", expectedOutput: "Area: 50.00", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <iostream>
#include <iomanip>

int main() {
    double w, h;
    if (std::cin >> w >> h) {
        std::cout << std::fixed << std::setprecision(2);
        std::cout << "Area: " << (w * h) << std::endl;
    }
    return 0;
}`,
    hints: ["Use std::fixed << std::setprecision(2) from <iomanip>."],
  },

  // Chapter 2: Types & Variables
  {
    id: "cpp_2_1",
    course: "cpp",
    chapterOrder: 2,
    programIndex: 0,
    title: "Uniform Initialization & Immutability",
    difficulty: "EASY",
    objective: "Understand uniform brace initialization and const immutability.",
    description: "Read an integer price and discount percent (integer 0-100). Calculate the final discounted price using `const double factor = (100 - discount) / 100.0;`. Print: `Final Price: <final_price>` formatted to 2 decimal places.",
    starterCode: `#include <iostream>
#include <iomanip>

int main() {
    double price;
    int discount;
    // Calculate final price
    return 0;
}`,
    constraints: ["0 <= discount <= 100", "price >= 0"],
    examples: [
      { input: "100 20", output: "Final Price: 80.00" },
    ],
    testCases: [
      { input: "100 20", expectedOutput: "Final Price: 80.00", isHidden: false, weight: 1 },
      { input: "250 10", expectedOutput: "Final Price: 225.00", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <iostream>
#include <iomanip>

int main() {
    double price{0.0};
    int discount{0};
    if (std::cin >> price >> discount) {
        const double factor{(100.0 - discount) / 100.0};
        const double finalPrice{price * factor};
        std::cout << std::fixed << std::setprecision(2);
        std::cout << "Final Price: " << finalPrice << std::endl;
    }
    return 0;
}`,
    hints: ["Use brace initialization syntax: double price{0.0};"],
  },

  // Chapter 3: Functions (Multi-Program: 2 Programs)
  // Program 3.1: Overloaded Function Set
  {
    id: "cpp_3_1",
    course: "cpp",
    chapterOrder: 3,
    programIndex: 0,
    title: "Program A: Overloaded Area Functions",
    difficulty: "EASY",
    objective: "Implement overloaded functions in C++.",
    description: "Implement two overloaded functions:\n- `double area(double side)` (Square area: side * side)\n- `double area(double length, double width)` (Rectangle area: length * width)\nRead token: if `S <side>`, print `Square: <area>`. If `R <l> <w>`, print `Rectangle: <area>`. Format to 1 decimal place.",
    starterCode: `#include <iostream>
#include <iomanip>

// Overloaded functions
double area(double side);
double area(double length, double width);

int main() {
    char type;
    // Read and dispatch
    return 0;
}`,
    constraints: ["Dimensions are positive doubles"],
    examples: [
      { input: "S 5", output: "Square: 25.0" },
      { input: "R 4 6", output: "Rectangle: 24.0" },
    ],
    testCases: [
      { input: "S 5", expectedOutput: "Square: 25.0", isHidden: false, weight: 1 },
      { input: "R 4 6", expectedOutput: "Rectangle: 24.0", isHidden: false, weight: 1 },
    ],
    referenceSolution: `#include <iostream>
#include <iomanip>

double area(double side) { return side * side; }
double area(double length, double width) { return length * width; }

int main() {
    char type;
    if (std::cin >> type) {
        std::cout << std::fixed << std::setprecision(1);
        if (type == 'S' || type == 's') {
            double s;
            std::cin >> s;
            std::cout << "Square: " << area(s) << std::endl;
        } else {
            double l, w;
            std::cin >> l >> w;
            std::cout << "Rectangle: " << area(l, w) << std::endl;
        }
    }
    return 0;
}`,
    hints: ["Function overloading allows functions with the same name but different signatures."],
  },

  // Program 3.2: Pass-by-Reference Transformer
  {
    id: "cpp_3_2",
    course: "cpp",
    chapterOrder: 3,
    programIndex: 1,
    title: "Program B: Pass-by-Reference Transformer",
    difficulty: "EASY",
    objective: "Modify values using pass-by-reference semantics.",
    description: "Implement function `void transform(int &val, int multiplier)`. Read integer `a` and integer `m`. Call `transform(a, m)` to update `a` in place. Print: `Transformed: <a>`.",
    starterCode: `#include <iostream>

void transform(int &val, int multiplier) {
    // Multiply val in place
}

int main() {
    int a, m;
    // Read and call transform
    return 0;
}`,
    constraints: ["Integers"],
    examples: [
      { input: "5 3", output: "Transformed: 15" },
    ],
    testCases: [
      { input: "5 3", expectedOutput: "Transformed: 15", isHidden: false, weight: 1 },
      { input: "-4 2", expectedOutput: "Transformed: -8", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <iostream>

void transform(int &val, int multiplier) {
    val *= multiplier;
}

int main() {
    int a, m;
    if (std::cin >> a >> m) {
        transform(a, m);
        std::cout << "Transformed: " << a << std::endl;
    }
    return 0;
}`,
    hints: ["Use int &val to take the argument by reference."],
  },

  // Chapter 4: Pointers & References
  {
    id: "cpp_4_1",
    course: "cpp",
    chapterOrder: 4,
    programIndex: 0,
    title: "Reference Semantics vs Pointers",
    difficulty: "EASY",
    objective: "Demonstrate pointer dereferencing and reference aliasing in C++.",
    description: "Read an integer `x`. Bind reference `int &ref = x` and pointer `int *ptr = &x`. Increment through pointer (`(*ptr)++`) and add 5 through reference (`ref += 5`). Print: `Result: <x>`.",
    starterCode: `#include <iostream>

int main() {
    int x;
    // Apply pointer and reference mutations
    return 0;
}`,
    constraints: ["Integer x"],
    examples: [
      { input: "10", output: "Result: 16" },
    ],
    testCases: [
      { input: "10", expectedOutput: "Result: 16", isHidden: false, weight: 1 },
      { input: "0", expectedOutput: "Result: 6", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <iostream>

int main() {
    int x;
    if (std::cin >> x) {
        int &ref = x;
        int *ptr = &x;
        (*ptr)++;
        ref += 5;
        std::cout << "Result: " << x << std::endl;
    }
    return 0;
}`,
    hints: ["Both pointer dereferencing and reference access point to the exact same memory location."],
  },

  // Chapter 5: Heap Memory & RAII
  {
    id: "cpp_5_1",
    course: "cpp",
    chapterOrder: 5,
    programIndex: 0,
    title: "Dynamic Array Manager with new[] and delete[]",
    difficulty: "MEDIUM",
    objective: "Allocate and deallocate dynamic heap arrays using new[] and delete[].",
    description: "Read integer `n` followed by `n` integers. Allocate array with `new int[n]`. Reverse the elements in place, print space-separated on one line, and deallocate with `delete[]`.",
    starterCode: `#include <iostream>

int main() {
    int n;
    // Allocate, reverse, print, delete[]
    return 0;
}`,
    constraints: ["1 <= n <= 50"],
    examples: [
      { input: "4\n1 2 3 4", output: "4 3 2 1" },
    ],
    testCases: [
      { input: "4\n1 2 3 4", expectedOutput: "4 3 2 1", isHidden: false, weight: 1 },
      { input: "3\n10 20 30", expectedOutput: "30 20 10", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <iostream>

int main() {
    int n;
    if (std::cin >> n && n > 0) {
        int *arr = new int[n];
        for (int i = 0; i < n; i++) std::cin >> arr[i];
        for (int i = 0; i < n / 2; i++) {
            int temp = arr[i];
            arr[i] = arr[n - 1 - i];
            arr[n - 1 - i] = temp;
        }
        for (int i = 0; i < n; i++) {
            std::cout << arr[i] << (i == n - 1 ? "" : " ");
        }
        std::cout << std::endl;
        delete[] arr;
    }
    return 0;
}`,
    hints: ["Always pair new[] with delete[] to prevent memory leaks."],
  },

  // Chapter 6: Classes & Encapsulation
  {
    id: "cpp_6_1",
    course: "cpp",
    chapterOrder: 6,
    programIndex: 0,
    title: "Encapsulated BankAccount with Member Initializer List",
    difficulty: "EASY",
    objective: "Use constructor member initializer lists and private fields.",
    description: "Create a class `BankAccount` with `owner` (std::string) and `balance` (double) initialized via a member initializer list. Provide `deposit(double amt)`. Read owner and deposit amount. Print: `Owner: <owner>, Balance: <balance>` with balance to 2 decimal places.",
    starterCode: `#include <iostream>
#include <string>
#include <iomanip>

class BankAccount {
    // Private fields, constructor with initializer list, deposit method
};

int main() {
    // Read and test
    return 0;
}`,
    constraints: ["Owner is a single word"],
    examples: [
      { input: "Alice 150.50", output: "Owner: Alice, Balance: 150.50" },
    ],
    testCases: [
      { input: "Alice 150.50", expectedOutput: "Owner: Alice, Balance: 150.50", isHidden: false, weight: 1 },
      { input: "Bob 500", expectedOutput: "Owner: Bob, Balance: 500.00", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <iostream>
#include <string>
#include <iomanip>

class BankAccount {
private:
    std::string owner;
    double balance;

public:
    BankAccount(std::string o, double b = 0.0) : owner(std::move(o)), balance(b) {}
    void deposit(double amt) { balance += amt; }
    void print() const {
        std::cout << std::fixed << std::setprecision(2);
        std::cout << "Owner: " << owner << ", Balance: " << balance << std::endl;
    }
};

int main() {
    std::string name;
    double dep;
    if (std::cin >> name >> dep) {
        BankAccount acc(name);
        acc.deposit(dep);
        acc.print();
    }
    return 0;
}`,
    hints: ["Use : owner(std::move(o)), balance(b) for member initialization."],
  },

  // Chapter 7: Inheritance & Polymorphism
  {
    id: "cpp_7_1",
    course: "cpp",
    chapterOrder: 7,
    programIndex: 0,
    title: "Virtual Shape Base Class with Derived Calculation",
    difficulty: "MEDIUM",
    objective: "Implement pure virtual methods and runtime polymorphism in C++.",
    description: "Create abstract class `Shape` with pure virtual method `virtual double area() const = 0;`. Derive `Circle` (r) (pi = 3.14159) and `Square` (s). Read shape type (`C` or `S`) followed by dimension. Print: `Area: <area>` formatted to 2 decimal places.",
    starterCode: `#include <iostream>
#include <iomanip>

class Shape {
public:
    virtual double area() const = 0;
    virtual ~Shape() = default;
};

// Implement derived classes Circle and Square

int main() {
    char type;
    // Dispatch
    return 0;
}`,
    constraints: ["Dimensions > 0"],
    examples: [
      { input: "C 3", output: "Area: 28.27" },
      { input: "S 4", output: "Area: 16.00" },
    ],
    testCases: [
      { input: "C 3", expectedOutput: "Area: 28.27", isHidden: false, weight: 1 },
      { input: "S 4", expectedOutput: "Area: 16.00", isHidden: false, weight: 1 },
    ],
    referenceSolution: `#include <iostream>
#include <iomanip>

class Shape {
public:
    virtual double area() const = 0;
    virtual ~Shape() = default;
};

class Circle : public Shape {
    double r;
public:
    Circle(double r) : r(r) {}
    double area() const override { return 3.14159 * r * r; }
};

class Square : public Shape {
    double s;
public:
    Square(double s) : s(s) {}
    double area() const override { return s * s; }
};

int main() {
    char type;
    if (std::cin >> type) {
        double val;
        std::cin >> val;
        Shape *s = nullptr;
        if (type == 'C' || type == 'c') s = new Circle(val);
        else s = new Square(val);

        std::cout << std::fixed << std::setprecision(2);
        std::cout << "Area: " << s->area() << std::endl;
        delete s;
    }
    return 0;
}`,
    hints: ["Use override keyword on derived class methods.", "Remember virtual destructor."],
  },

  // Chapter 8: Operator Overloading
  {
    id: "cpp_8_1",
    course: "cpp",
    chapterOrder: 8,
    programIndex: 0,
    title: "Custom ComplexNumber Operator Overloading",
    difficulty: "MEDIUM",
    objective: "Overload operator+ and stream insertion operator<<.",
    description: "Create struct `Complex` with `real` and `imag`. Overload `operator+` to add two complex numbers, and `operator<<` to print in format `<real> + <imag>i`. Read `r1 i1 r2 i2`. Print sum.",
    starterCode: `#include <iostream>

struct Complex {
    double real, imag;
    // Overload operator+ and operator<<
};

int main() {
    // Read and sum
    return 0;
}`,
    constraints: ["All real and imag are non-negative doubles"],
    examples: [
      { input: "3 2 1 7", output: "4 + 9i" },
    ],
    testCases: [
      { input: "3 2 1 7", expectedOutput: "4 + 9i", isHidden: false, weight: 1 },
      { input: "5 0 2 4", expectedOutput: "7 + 4i", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <iostream>

struct Complex {
    double real, imag;
    Complex operator+(const Complex &other) const {
        return {real + other.real, imag + other.imag};
    }
};

std::ostream &operator<<(std::ostream &os, const Complex &c) {
    os << (long)c.real << " + " << (long)c.imag << "i";
    return os;
}

int main() {
    Complex c1, c2;
    if (std::cin >> c1.real >> c1.imag >> c2.real >> c2.imag) {
        Complex sum = c1 + c2;
        std::cout << sum << std::endl;
    }
    return 0;
}`,
    hints: ["Return Complex{real + other.real, imag + other.imag}."],
  },

  // Chapter 9: Templates
  {
    id: "cpp_9_1",
    course: "cpp",
    chapterOrder: 9,
    programIndex: 0,
    title: "Generic clampValue<T> Function Template",
    difficulty: "EASY",
    objective: "Implement a generic function template.",
    description: "Implement function template `T clampValue(T val, T low, T high)` that returns `low` if `val < low`, `high` if `val > high`, and `val` otherwise. Read `val low high` (doubles). Print `Clamped: <result>` with 1 decimal place.",
    starterCode: `#include <iostream>
#include <iomanip>

template <typename T>
T clampValue(T val, T low, T high) {
    // Implement clamp
}

int main() {
    double v, l, h;
    // Read and clamp
    return 0;
}`,
    constraints: ["low <= high"],
    examples: [
      { input: "15 0 10", output: "Clamped: 10.0" },
      { input: "-5 0 10", output: "Clamped: 0.0" },
      { input: "7 0 10", output: "Clamped: 7.0" },
    ],
    testCases: [
      { input: "15 0 10", expectedOutput: "Clamped: 10.0", isHidden: false, weight: 1 },
      { input: "-5 0 10", expectedOutput: "Clamped: 0.0", isHidden: false, weight: 1 },
      { input: "7 0 10", expectedOutput: "Clamped: 7.0", isHidden: false, weight: 1 },
    ],
    referenceSolution: `#include <iostream>
#include <iomanip>

template <typename T>
T clampValue(T val, T low, T high) {
    if (val < low) return low;
    if (val > high) return high;
    return val;
}

int main() {
    double v, l, h;
    if (std::cin >> v >> l >> h) {
        std::cout << std::fixed << std::setprecision(1);
        std::cout << "Clamped: " << clampValue(v, l, h) << std::endl;
    }
    return 0;
}`,
    hints: ["Use template <typename T> before the function definition."],
  },

  // Chapter 10: STL Containers
  {
    id: "cpp_10_1",
    course: "cpp",
    chapterOrder: 10,
    programIndex: 0,
    title: "Word Frequency Counter with std::map",
    difficulty: "EASY",
    objective: "Use std::map for sorted associative key-value mapping.",
    description: "Read `n` words from standard input. Count the occurrences of each word using `std::map<std::string, int>`. Print each word and its count in alphabetical order: `<word>: <count>`.",
    starterCode: `#include <iostream>
#include <string>
#include <map>

int main() {
    int n;
    // Read and count
    return 0;
}`,
    constraints: ["1 <= n <= 50"],
    examples: [
      { input: "4\napple banana apple orange", output: "apple: 2\nbanana: 1\norange: 1" },
    ],
    testCases: [
      { input: "4\napple banana apple orange", expectedOutput: "apple: 2\nbanana: 1\norange: 1", isHidden: false, weight: 1 },
      { input: "3\ncat dog cat", expectedOutput: "cat: 2\ndog: 1", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <iostream>
#include <string>
#include <map>

int main() {
    int n;
    if (std::cin >> n) {
        std::map<std::string, int> counts;
        for (int i = 0; i < n; i++) {
            std::string w;
            std::cin >> w;
            counts[w]++;
        }
        for (const auto &pair : counts) {
            std::cout << pair.first << ": " << pair.second << std::endl;
        }
    }
    return 0;
}`,
    hints: ["std::map automatically sorts entries by key in ascending order."],
  },

  // Chapter 11: STL Algorithms
  {
    id: "cpp_11_1",
    course: "cpp",
    chapterOrder: 11,
    programIndex: 0,
    title: "std::sort with Custom Lambda Predicate",
    difficulty: "MEDIUM",
    objective: "Sort using std::sort with a modern lambda predicate.",
    description: "Read `n` followed by `n` integers. Sort the array such that all even numbers come before odd numbers, and within each group numbers are sorted in ascending order. Print the sorted elements space-separated.",
    starterCode: `#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    int n;
    // Sort with lambda
    return 0;
}`,
    constraints: ["1 <= n <= 100"],
    examples: [
      { input: "5\n5 2 8 1 4", output: "2 4 8 1 5" },
    ],
    testCases: [
      { input: "5\n5 2 8 1 4", expectedOutput: "2 4 8 1 5", isHidden: false, weight: 1 },
      { input: "4\n9 7 5 3", expectedOutput: "3 5 7 9", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    int n;
    if (std::cin >> n && n > 0) {
        std::vector<int> v(n);
        for (int i = 0; i < n; i++) std::cin >> v[i];
        std::sort(v.begin(), v.end(), [](int a, int b) {
            bool aEven = (a % 2 == 0);
            bool bEven = (b % 2 == 0);
            if (aEven != bEven) return aEven;
            return a < b;
        });
        for (int i = 0; i < n; i++) {
            std::cout << v[i] << (i == n - 1 ? "" : " ");
        }
        std::cout << std::endl;
    }
    return 0;
}`,
    hints: ["In the lambda, if (aEven != bEven) return aEven; else return a < b;"],
  },

  // Chapter 12: Exceptions & Smart Pointers (Multi-Program: 2 Programs)
  // Program 12.1: Custom Exception Hierarchy
  {
    id: "cpp_12_1",
    course: "cpp",
    chapterOrder: 12,
    programIndex: 0,
    title: "Program A: Custom Exception Hierarchy",
    difficulty: "EASY",
    objective: "Create and catch a custom std::exception.",
    description: "Derive class `NegativeValueError : public std::exception`. Read an integer `val`. If `val < 0`, throw `NegativeValueError` and catch it, printing `Error: Negative value rejected`. If `val >= 0`, print `Accepted: <val>`.",
    starterCode: `#include <iostream>
#include <exception>

class NegativeValueError : public std::exception {
    // Custom exception
};

int main() {
    int val;
    // Read and try/catch
    return 0;
}`,
    constraints: ["Input integer"],
    examples: [
      { input: "10", output: "Accepted: 10" },
      { input: "-3", output: "Error: Negative value rejected" },
    ],
    testCases: [
      { input: "10", expectedOutput: "Accepted: 10", isHidden: false, weight: 1 },
      { input: "-3", expectedOutput: "Error: Negative value rejected", isHidden: false, weight: 1 },
    ],
    referenceSolution: `#include <iostream>
#include <exception>

class NegativeValueError : public std::exception {
public:
    const char *what() const noexcept override {
        return "Error: Negative value rejected";
    }
};

int main() {
    int val;
    if (std::cin >> val) {
        try {
            if (val < 0) throw NegativeValueError();
            std::cout << "Accepted: " << val << std::endl;
        } catch (const NegativeValueError &e) {
            std::cout << e.what() << std::endl;
        }
    }
    return 0;
}`,
    hints: ["Override const char *what() const noexcept in your exception."],
  },

  // Program 12.2: Resource Guard with std::unique_ptr
  {
    id: "cpp_12_2",
    course: "cpp",
    chapterOrder: 12,
    programIndex: 1,
    title: "Program B: Resource Guard with std::unique_ptr",
    difficulty: "EASY",
    objective: "Manage heap memory automatically using std::unique_ptr.",
    description: "Read an integer `n`. Allocate using `std::make_unique<int>(n)`. Print `Value: <*ptr>`. The memory is automatically freed when leaving scope.",
    starterCode: `#include <iostream>
#include <memory>

int main() {
    int n;
    // Use std::make_unique<int>
    return 0;
}`,
    constraints: ["Input integer"],
    examples: [
      { input: "42", output: "Value: 42" },
    ],
    testCases: [
      { input: "42", expectedOutput: "Value: 42", isHidden: false, weight: 1 },
      { input: "100", expectedOutput: "Value: 100", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <iostream>
#include <memory>

int main() {
    int n;
    if (std::cin >> n) {
        auto ptr = std::make_unique<int>(n);
        std::cout << "Value: " << *ptr << std::endl;
    }
    return 0;
}`,
    hints: ["Use std::make_unique<int>(n) from <memory>."],
  },

  // Chapter 13: Advanced Memory Management & Smart Pointers
  {
    id: "cpp_13_1",
    course: "cpp",
    chapterOrder: 13,
    programIndex: 0,
    title: "Shared Ownership Lifecycle with std::shared_ptr",
    difficulty: "EASY",
    objective: "Manage shared ownership and inspect reference counts with std::shared_ptr.",
    description: "Read an integer `val`. Allocate a shared resource using `auto p1 = std::make_shared<int>(val);`. Create a second pointer `auto p2 = p1;`. Print: `Value: <*p1>, Count: <p1.use_count()>`. Call `p2.reset();` to release one reference, and print: `After Reset Count: <p1.use_count()>`. Memory is released when all owners release.",
    starterCode: `#include <iostream>
#include <memory>

int main() {
    int val;
    // Use std::make_shared and use_count()
    return 0;
}`,
    constraints: ["Input integer"],
    examples: [
      { input: "42", output: "Value: 42, Count: 2\nAfter Reset Count: 1" },
    ],
    testCases: [
      { input: "42", expectedOutput: "Value: 42, Count: 2\nAfter Reset Count: 1", isHidden: false, weight: 1 },
      { input: "100", expectedOutput: "Value: 100, Count: 2\nAfter Reset Count: 1", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <iostream>
#include <memory>

int main() {
    int val;
    if (std::cin >> val) {
        auto p1 = std::make_shared<int>(val);
        auto p2 = p1;
        std::cout << "Value: " << *p1 << ", Count: " << p1.use_count() << std::endl;
        p2.reset();
        std::cout << "After Reset Count: " << p1.use_count() << std::endl;
    }
    return 0;
}`,
    hints: ["Use std::make_shared<int>(val) and p1.use_count().", "Use p2.reset() to drop one reference."],
  },

  // Chapter 14: Modern C++ Features (C++11 to C++20)
  {
    id: "cpp_14_1",
    course: "cpp",
    chapterOrder: 14,
    programIndex: 0,
    title: "Structured Bindings & auto Type Deductions",
    difficulty: "EASY",
    objective: "Use C++17 structured bindings to unpack pairs/tuples.",
    description: "Read an ID (int) and Status (string). Pack into `std::pair<int, std::string>`. Unpack using structured bindings `auto [id, status] = pair;`. Print: `ID: <id>, Status: <status>`.",
    starterCode: `#include <iostream>
#include <string>
#include <utility>

int main() {
    int id;
    std::string status;
    // Structured bindings
    return 0;
}`,
    constraints: ["Single word status"],
    examples: [
      { input: "101 ACTIVE", output: "ID: 101, Status: ACTIVE" },
    ],
    testCases: [
      { input: "101 ACTIVE", expectedOutput: "ID: 101, Status: ACTIVE", isHidden: false, weight: 1 },
      { input: "202 PENDING", expectedOutput: "ID: 202, Status: PENDING", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <iostream>
#include <string>
#include <utility>

int main() {
    int inputId;
    std::string inputStatus;
    if (std::cin >> inputId >> inputStatus) {
        std::pair<int, std::string> p{inputId, inputStatus};
        auto [id, status] = p;
        std::cout << "ID: " << id << ", Status: " << status << std::endl;
    }
    return 0;
}`,
    hints: ["C++17 structured bindings: auto [a, b] = myPair;"],
  },

  // Chapter 15: Concurrency and Multithreading in C++
  {
    id: "cpp_15_1",
    course: "cpp",
    chapterOrder: 15,
    programIndex: 0,
    title: "Multi-threaded Worker Simulation",
    difficulty: "MEDIUM",
    objective: "Demonstrate multi-threaded worker processing.",
    description: "Read integer `n`. Run a loop simulating `n` worker tasks. For each task `i` from 1 to n: print `Worker <i> finished`. Then print `All workers complete`.",
    starterCode: `#include <iostream>

int main() {
    int n;
    // Worker simulation
    return 0;
}`,
    constraints: ["1 <= n <= 10"],
    examples: [
      { input: "3", output: "Worker 1 finished\nWorker 2 finished\nWorker 3 finished\nAll workers complete" },
    ],
    testCases: [
      { input: "3", expectedOutput: "Worker 1 finished\nWorker 2 finished\nWorker 3 finished\nAll workers complete", isHidden: false, weight: 1 },
      { input: "1", expectedOutput: "Worker 1 finished\nAll workers complete", isHidden: true, weight: 1 },
    ],
    referenceSolution: `#include <iostream>

int main() {
    int n;
    if (std::cin >> n) {
        for (int i = 1; i <= n; i++) {
            std::cout << "Worker " << i << " finished" << std::endl;
        }
        std::cout << "All workers complete" << std::endl;
    }
    return 0;
}`,
    hints: ["Print sequential worker status followed by completion header."],
  },
];

