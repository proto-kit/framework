describe("inheritance & modularity", () => {
  function decorator<T extends Base>(
    target: T & { constructor: any },
    methodName: string,
    descriptor: PropertyDescriptor
  ) {
    const f = descriptor.value;
    descriptor.value = function (x: Base) {
      console.log("Hello");
      expect((this as any).some()).toBe("testValue");
      f(this);
    };
  }

  class Base {
    some() {
      return "testValue";
    }

    @decorator
    x() {}
  }

  it("expect decorator to work with prototype overriding", () => {
    expect.assertions(3);

    const f = (base: Base) => {
      expect(base.some()).toBe("testValue");
    };
    const propertyDescriptor: PropertyDescriptor = {
      value: f,
    };
    decorator(Base.prototype, "y", propertyDescriptor);
    (Base.prototype as any).y = propertyDescriptor.value;

    const base = new Base() as Base & { y: () => void };

    base.x();
    base.y();
  });

  it("test correct composition", async () => {

  });
});
