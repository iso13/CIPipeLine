const { add, subtract, multiply, divide } = require("../src/calculator");

describe("Calculator", () => {
  describe("add()", () => {
    it("adds two positive numbers", () => {
      expect(add(2, 3)).toBe(5);
    });

    it("adds a positive and negative number", () => {
      expect(add(10, -4)).toBe(6);
    });

    it("adds two zeros", () => {
      expect(add(0, 0)).toBe(0);
    });

    it("throws TypeError for non-number inputs", () => {
      expect(() => add("2", 3)).toThrow(TypeError);
    });
  });

  describe("subtract()", () => {
    it("subtracts two positive numbers", () => {
      expect(subtract(10, 4)).toBe(6);
    });

    it("returns negative when result is negative", () => {
      expect(subtract(3, 10)).toBe(-7);
    });

    it("throws TypeError for non-number inputs", () => {
      expect(() => subtract(null, 3)).toThrow(TypeError);
    });
  });

  describe("multiply()", () => {
    it("multiplies two positive numbers", () => {
      expect(multiply(3, 4)).toBe(12);
    });

    it("multiplies by zero", () => {
      expect(multiply(5, 0)).toBe(0);
    });

    it("multiplies two negative numbers", () => {
      expect(multiply(-3, -4)).toBe(12);
    });

    it("throws TypeError for non-number inputs", () => {
      expect(() => multiply("a", 4)).toThrow(TypeError);
    });
  });

  describe("divide()", () => {
    it("divides two positive numbers", () => {
      expect(divide(10, 2)).toBe(5);
    });

    it("returns a decimal result", () => {
      expect(divide(7, 2)).toBe(3.5);
    });

    it("throws an error when dividing by zero", () => {
      expect(() => divide(5, 0)).toThrow("Cannot divide by zero");
    });

    it("throws TypeError for non-number inputs", () => {
      expect(() => divide(10, "2")).toThrow(TypeError);
    });
  });
});
