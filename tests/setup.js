globalThis.document = {
  getElementById: () => ({
    parentElement: {
      classList: {
        remove: () => {},
        add: () => {},
        set value(val) {},
        get value() { return ""; }
      }
    }
  }),
  querySelectorAll : () => [{}]
};

globalThis.localStorage = {
    getItem: (name) => null,
    setItem: (name, val) => null
}