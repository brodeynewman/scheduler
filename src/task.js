/**
 * This probably is a bit overkill to have as it's own class...
 * in a separate file, but oh well.
 */
class Task {
  constructor(identifier) {
    this.identifier = identifier

    this.dependencies = []
  }

  setDependencies(deps) {
    this.dependencies = [...this.dependencies, ...deps]
  }

  setDependency(dep) {
    this.dependencies = [...this.dependencies, dep]
  }
}

module.exports = Task