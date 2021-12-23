# Task scheduler

This project contains the code for a task scheduler. Errors are outputted to stderr with exit code of 1 while valid input is outputted to stdout.

## Running the project

This project assumes you are on Node 16.

```
nvm use 16
```

Install dependencies

```
npm i
```

The start script points to the `input.txt` file in the root of this directory. Replace this file with custom input text to run changes.

```
npm start
```

An example output might look like: `D C B A` assuming the sample input file looked like below:

```
# hello there
A:B,C
C:D
D:
```

## Running tests

```
npm test
```

The above command runs some example cases through `jest`.

## Assumptions about the task

While studying the 4 examples that were given, the following assumptions were made:

1. Cyclical dependencies can't exist in the tree (maybe????). Example:
```bash
A:B,C
B:A
A:

# Would produce the following tree (which would be invalid)

#   A
#  / \
# B   C
# |
# A
```

2. Tree will always be a tree & not a graph.
  
```bash
A:B,C
B:D
C:B
B:

# Would produce the following tree (which would be invalid)

#   A
#  / \
# B - C
# |
# D
```


3. The algorithm will output 1 of the many possible outputs. The below example has multiple potential outcomes, but the one outputted is valid.
  
```bash
A:B,C,D
B:E,H
C:E
E:F
D:G
G:

# below is sent to stdout
F G H E D C B A
```

## TODO:
1. Look into cyclical dependency issue [DONE]
