const { expect } = require("@jest/globals");
const { createTaskTree, buildOutputMessageFromTree } = require("./index");

const spyConsole = () => {
  let spy = {}

  beforeEach(() => {
    spy.console = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    spy.console.mockClear()
  })

  afterAll(() => {
    spy.console.mockRestore()
  })

  return spy
}

const spyProcess = () => {
  let spy = {}

  beforeEach(() => {
    spy.process = jest.spyOn(process, 'exit').mockImplementation(() => {})
  })

  afterEach(() => {
    spy.process.mockClear()
  })

  afterAll(() => {
    spy.process.mockRestore()
  })

  return spy
}

describe("fauna assessment", () => {
  describe("createTaskTree", () => {
    const spy = spyConsole()
    const processSpy = spyProcess()

    it("Should build trees if separator is found", () => {
      const lines = [
        "# foobar",
        "# another comment",
        "T:A,B",
        "A:",
        "B:",
        "",
        "# foobar",
        "# another comment",
        "T:A,B",
        "A:",
        "B:",
      ];

      const trees = createTaskTree(lines);

      expect(trees.length).toEqual(2);
      expect(trees).toEqual([
        [
          {
            identifier: "T",
            dependencies: [
              { identifier: "A", dependencies: [] },
              { identifier: "B", dependencies: [] },
            ],
          },
          { identifier: "A", dependencies: [] },
          { identifier: "B", dependencies: [] },
        ],
        [
          {
            identifier: "T",
            dependencies: [
              { identifier: "A", dependencies: [] },
              { identifier: "B", dependencies: [] },
            ],
          },
          { identifier: "A", dependencies: [] },
          { identifier: "B", dependencies: [] },
        ],
      ]);
    });

    it("Should build a simple binary tree", () => {
      const lines = ["# foobar", "# another comment", "T:A,B", "A:", "B:"];

      const trees = createTaskTree(lines);

      expect(trees.length).toEqual(1);
      expect(trees).toEqual([
        [
          {
            identifier: "T",
            dependencies: [
              { identifier: "A", dependencies: [] },
              { identifier: "B", dependencies: [] },
            ],
          },
          { identifier: "A", dependencies: [] },
          { identifier: "B", dependencies: [] },
        ],
      ]);
    });

    it("Should handle multi-layer tree", () => {
      const lines = [
        "# foobar",
        "# another comment",
        "T:A,B",
        "A:C",
        "B:C",
        "C:D",
        "D:",
      ];

      const trees = createTaskTree(lines);

      expect(trees.length).toEqual(1);
      expect(trees).toEqual([
        [
          {
            identifier: "T",
            dependencies: [
              {
                identifier: "A",
                dependencies: [
                  {
                    identifier: "C",
                    dependencies: [{ identifier: "D", dependencies: [] }],
                  },
                ],
              },
              {
                identifier: "B",
                dependencies: [
                  {
                    identifier: "C",
                    dependencies: [{ identifier: "D", dependencies: [] }],
                  },
                ],
              },
            ],
          },
          { identifier: "D", dependencies: [] },
        ],
      ]);
    });

    it("Should handle multi-level + multi-leaf node lists", () => {
      const lines = [
        "# foobar",
        "# another comment",
        "T:A,B,C",
        "B:D",
        "C:F",
        "D:F",
        "A:D,E,F",
        "E:",
        "F:",
      ];

      const trees = createTaskTree(lines);

      expect(trees.length).toEqual(1);
      expect(trees).toEqual([
        [
          {
            identifier: "T",
            dependencies: [
              {
                identifier: "A",
                dependencies: [
                  { identifier: "D", dependencies: [] },
                  { identifier: "E", dependencies: [] },
                  { identifier: "F", dependencies: [] },
                ],
              },
              {
                identifier: "B",
                dependencies: [
                  {
                    identifier: "D",
                    dependencies: [{ identifier: "F", dependencies: [] }],
                  },
                ],
              },
              {
                identifier: "C",
                dependencies: [{ identifier: "F", dependencies: [] }],
              },
            ],
          },
          { identifier: "E", dependencies: [] },
          { identifier: "F", dependencies: [] },
        ],
      ]);
    });

    it('should throw if a cyclical dependency is encountered', () => {
      const lines = [
        "# foobar",
        "# another comment",
        "A:B,C",
        "C:D",
        "D:A", // D can't depend on A since A is a parent. Should throw cyclical here.
      ];

      createTaskTree(lines);

      // Ensure we throw the correct error
      expect(spy.console.mock.calls[0][0]).toEqual('[Error] - Cyclical dependency: [A] encountered on line: [5].')

      // ensure exit status of 1 is thrown
      expect(processSpy.process.mock.calls[0][0]).toEqual(1)
    })

    it('should error on malformed task identifier if identifier has length > 20', () => {
      const lines = [
        "# foobar",
        "# another comment",
        "A:ABCDEFGHKLMNOPQRSTUVW",
        "C:D",
        "D:A", // D can't depend on A since A is a parent. Should throw cyclical here.
      ];

      createTaskTree(lines);

      // Ensure we throw the correct error
      expect(spy.console.mock.calls[0][0]).toEqual('[Error] - Invalid task identifier: [ABCDEFGHKLMNOPQRSTUVW] encountered on line: [3]. Task identifiers must match pattern of /^[a-zA-Z]{1,20}$/i.')

      // ensure exit status of 1 is thrown
      expect(processSpy.process.mock.calls[0][0]).toEqual(1)
    })

    it('should error on malformed task identifier with no colon', () => {
      const lines = [
        "# foobar",
        "# another comment",
        "A:ABCDEFGHKL",
        "C",
        "D:A", // D can't depend on A since A is a parent. Should throw cyclical here.
      ];

      createTaskTree(lines);

      // Ensure we throw the correct error
      expect(spy.console.mock.calls[0][0]).toEqual('[Error] - Invalid task: [C] encountered on line: [4]. Task must include a \":\" separator to be considered valid.')

      // ensure exit status of 1 is thrown
      expect(processSpy.process.mock.calls[0][0]).toEqual(1)
    })

    it('should error on malformed task identifier with non alphabetic characters', () => {
      const lines = [
        "# foobar",
        "# another comment",
        "A:ABCDEFGHKL1",
        "C:D",
        "D:A", // D can't depend on A since A is a parent. Should throw cyclical here.
      ];

      createTaskTree(lines);

      // Ensure we throw the correct error
      expect(spy.console.mock.calls[0][0]).toEqual('[Error] - Invalid task identifier: [ABCDEFGHKL1] encountered on line: [3]. Task identifiers must match pattern of /^[a-zA-Z]{1,20}$/i.')

      // ensure exit status of 1 is thrown
      expect(processSpy.process.mock.calls[0][0]).toEqual(1)
    })

    it('should error on malformed task identifier', () => {
      const lines = [
        "# foobar",
        "# another comment",
        "A:BASDJFASJDFLKASDFJKLASDFJLK",
        "C:D",
        "D:A", // D can't depend on A since A is a parent. Should throw cyclical here.
      ];

      createTaskTree(lines);

      // Ensure we throw the correct error
      expect(spy.console.mock.calls[0][0]).toEqual('[Error] - Invalid task identifier: [BASDJFASJDFLKASDFJKLASDFJLK] encountered on line: [3]. Task identifiers must match pattern of /^[a-zA-Z]{1,20}$/i.')

      // ensure exit status of 1 is thrown
      expect(processSpy.process.mock.calls[0][0]).toEqual(1)
    })

    it("Should handle building a tree with words", () => {
      const lines = [
        "# foobar",
        "# another comment",
        "Release:LoadTest,FunctionalTest,VirusScan",
        "LoadTest:Build",
        "FunctionalTest:Build",
        "VirusScan:Build",
        "Build:",
      ];

      const trees = createTaskTree(lines);

      expect(trees.length).toEqual(1);
      expect(trees).toEqual([
        [
          {
            identifier: "Release",
            dependencies: [
              {
                identifier: "LoadTest",
                dependencies: [{ identifier: "Build", dependencies: [] }],
              },
              {
                identifier: "FunctionalTest",
                dependencies: [{ identifier: "Build", dependencies: [] }],
              },
              {
                identifier: "VirusScan",
                dependencies: [{ identifier: "Build", dependencies: [] }],
              },
            ],
          },
          { identifier: "Build", dependencies: [] },
        ],
      ]);
    });
  });

  describe("buildOutputMessageFromTree", () => {
    it('should format output based on a tree', () => {
      const tree = 
        [
          {
            identifier: "T",
            dependencies: [
              {
                identifier: "A",
                dependencies: [
                  { identifier: "D", dependencies: [] },
                  { identifier: "E", dependencies: [] },
                  { identifier: "F", dependencies: [] },
                ],
              },
              {
                identifier: "B",
                dependencies: [
                  {
                    identifier: "D",
                    dependencies: [{ identifier: "F", dependencies: [] }],
                  },
                ],
              },
              {
                identifier: "C",
                dependencies: [{ identifier: "F", dependencies: [] }],
              },
            ],
          },
          { identifier: "E", dependencies: [] },
          { identifier: "F", dependencies: [] },
        ]

      const output = buildOutputMessageFromTree(tree)

      expect(output).toEqual('F E D C B A T')
    })
  })
});
