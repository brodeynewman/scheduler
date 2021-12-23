const fs = require("fs");
const path = require("path");

const Task = require("./task");

/**
 * Our regex pattern to check
 */
const identifier_REGEX = /^[a-zA-Z]{1,20}$/i;

/**
 * Checks to see if a line is falsy.
 * @param {string?} line - String to check
 * @returns {Boolean} - True if falsy, false otherwise
 */
const checkFalsyLine = (line = "") => {
  if (line[0] === "#") {
    return true;
  }

  return false;
};

/**
 * Parses a task list and returns identifier + dependencies.s
 * @param {string} task - Task list string. Ex: A:B,C,D
 * @returns {identifier, dependencies} - Object containing task information
 */
const parseTask = (task, line) => {
  if (task && !task.includes(":")) {
    console.error(
      `[Error] - Invalid task: [${task}] encountered on line: [${line}]. Task must include a ":" separator to be considered valid.`
    );
    process.exit(1);
  }

  const identifier = task.slice(0, task.indexOf(":"));
  const depList = task.slice(task.indexOf(":") + 1, task.length);

  // no dependencies in this case.
  if (!depList.length) {
    return {
      identifier,
      dependencies: [],
    };
  }

  const dependencies = depList.split(",");

  return {
    identifier,
    dependencies,
  };
};

/**
 * Ensures the identifiers match a particular regex pattern.
 * @param {Array} identifiers - List of identifiers to check
 * @param {number} line - The line number for helpful error reference.
 * @returns {Error|void} - Error if one is thrown, void otherwise
 */
const validateIdentifiers = (identifiers, line) => {
  identifiers.forEach((identifier) => {
    const passesRegex = identifier_REGEX.test(identifier);

    if (!passesRegex) {
      const error = `[Error] - Invalid task identifier: [${identifier}] encountered on line: [${line}]. Task identifiers must match pattern of ${identifier_REGEX.toString()}.`;

      console.error(error);
      process.exit(1);
    }
  });
};

/**
 * Throws a custom cyclical dependency error.
 * @param {string} identifier - Identifier to reference in error
 * @param {number} line - Line number to throw an error on.
 */
const throwCyclicalDependencyError = (identifier, line) => {
  const error = `[Error] - Cyclical dependency: [${identifier}] encountered on line: [${line}].`;

  console.error(error);
  process.exit(1);
};

/**
 * Ensures a list of task identifiers are validated
 */
const validateTask = ({ identifier, dependencies, currentLine }) => {
  // validate that our current identifier + all of it's dependencies have valid identifier names
  validateIdentifiers([identifier, ...dependencies], currentLine);
};

const validateCyclicalDependencies = (dep, tree, line) => {
  let walk = [tree[0]];
  let visited = {};

  while (walk.length) {
    const popped = walk.shift();

    // once we hit this character (arbitrary), we know we hit the end of our DFS
    // so we can reset our visitation cache.
    if (popped === '|') {
      visited = {}
      break;
    }

    if (popped?.dependencies?.length) {
      walk.unshift(...popped.dependencies)
    } else {
      walk.unshift('|')
    }

    if (visited[dep.identifier]) {
      throwCyclicalDependencyError(dep.identifier, line)
    }

    visited[popped.identifier] = true;
  }
}

const buildTree = ({
  identifier,
  currentLine,
  dependencies,
  currentTaskTree,
}) => {
  let tree = currentTaskTree;

  // spawn our new task
  const task = new Task(identifier);

  if (!dependencies.length) {
    tree.push(task);
    return tree;
  }

  const deps = dependencies.map((identifier) => new Task(identifier));

  // we need to initiate our tree
  if (!currentTaskTree.length && dependencies.length) {
    task.setDependencies(deps);
    tree.push(task);

    return tree;
  } else {
    let walk = [tree[0]];

    // BFS to walk our tree and append dependencies accordingly
    while (walk.length) {
      const popped = walk.shift();

      if (popped?.dependencies?.length) {
        walk = [...walk, ...popped.dependencies];
      }

      if (popped.identifier === identifier) {
        // loop through the new dependencies and make sure there wont be...
        // a cyclical dependency issue with any of them.
        deps.forEach((identifier) => {
          // check to see if we have cyclical dependencies
          // otherwise, add our deps to the current node in the list
          validateCyclicalDependencies(identifier, tree, currentLine)
          popped.setDependency(identifier);
        });
      }
    }

    return tree;
  }
};

const createTaskTree = (lines) => {
  const tasks = [];
  let currentTaskTree = [];

  // 1. Loop through every line and run our input validation against the current task list
  // 2. Check to see if the current task list has ended
  for (let i = 0; i < lines.length; i++) {
    const currLine = lines[i];
    const currentLineIndex = i + 1;

    // Don't process any line that we consider 'bad'. Aka lines that are commented out.
    if (checkFalsyLine(currLine)) continue;

    // If we get 2 dead lines in a row, we know can skip since..
    // we're not building our next task tree yet.
    if (!currentTaskTree.length && !currLine) continue;

    // Our current task set has ended, so kill our task set and start a new one
    if (currentTaskTree.length && !currLine) {
      tasks.push(currentTaskTree);
      currentTaskTree = [];

      continue;
    }

    // we pass our task set to our
    const { identifier, dependencies } = parseTask(currLine, currentLineIndex);

    // validate that our identifier & the dependencies meet validation rules.
    validateTask({
      identifier,
      dependencies,
      currentTaskTree,
      currentLine: currentLineIndex,
    });

    currentTaskTree = buildTree({
      identifier,
      dependencies,
      currentTaskTree,
      currentLine: currentLineIndex,
    });

    // this is a special case for when people forget to add a \n at the end of the file
    if (currentTaskTree.length && i === lines.length - 1) {
      tasks.push(currentTaskTree);
      currentTaskTree = [];
    }
  }

  return tasks;
};

const buildOutputMessageFromTree = (tree) => {
  let walk = [tree[0]];
  let taskString = "";

  const visited = {};

  // BFS to walk our tree and append dependencies accordingly
  while (walk.length) {
    const popped = walk.shift();

    if (visited[popped.identifier]) continue;

    taskString += ` ${popped.identifier}`;
    visited[popped.identifier] = true;

    if (popped?.dependencies?.length) {
      walk = [...walk, ...popped.dependencies];
    }
  }

  const reversedTasks = taskString.split(" ").reverse().join(",");
  return reversedTasks.split(",").join(" ").trim();
}

const printTasks = (tasks) => {
  for (let i = 0; i < tasks.length; i++) {
    const output = buildOutputMessageFromTree(tasks[i])

    // output our tasks to stdout
    console.log(output);
  }
};

const main = () => {
  const file = fs.readFileSync(path.resolve(__dirname, "..", "./input.txt"));
  const str = Buffer.from(file).toString();
  const lines = str.split("\n");

  const tasks = createTaskTree(lines);

  printTasks(tasks);
};

// execute our script if the file is invoked via a script or through the terminal
if (require.main === module) {
  // start program
  main();
}

module.exports = {
  printTasks,
  createTaskTree,
  buildOutputMessageFromTree,
}