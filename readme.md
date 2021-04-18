# judix

This program is to simulate the operations of 
- query of the available daily causes lists from judiciary website (https://e-services.judiciary.hk/dcl/index.jsp?lang=tc),
- reformat of the content of daily causes lists, and
- save the the reformatted content in excel or json format in automatical way.

## Issues

This program has the following issues:

- No serious exception handling (some error/exception messages are strange for general users)
- Not all forms of daily causes lists are implemented. ( get more info with `--show-detail`)
- The program is developed and tested on **WSL2** with NodeJS version 12. But it should work on **Windows 10**, **Mac**, or **Linux** as well.

## Installation

Install with the project source code which is in `judix.zip`.

1. Unzip the file `judix.zip` to somewhere (e.g. `judix`)

2. In terminal, go to the unzip folder of step 1. and then go to the folder containing `package.json`

3. Run the command  ```npm i . ```. E.g.
  
  ```shell
  simon@LAPTOP-SIMON:/mnt/c/cubby/judix/$npm i .
  ```

## Usage

Run `judix` with default behavior (the generated `xlsx` files are stored in `./output` sub-directory of the project root directory.) 

```
node judix
```

Other options:

```
[USAGE] node judix

node judix --help        help message
node judix <option>

<option>:
 --flush         flush the output dir before any action
 --flush-only    only flush the output dir. No further actions.
 --json          generate the corresponding JSON.
 --no-json       doesn't generate the corresponding JSON. (default)
 --xlsx          generate the corresponding Xlsx. (default)
 --no-xlsx       doesn't generate the corresponding Xlsx.
 --show-detail   display process detail message. (default)
 --hide-detail   doesn't display process detail message.
```

## Output

There are two possible file formats of the daily causes list: `JSON` or `XLSX`. 

The filename has the pattern: `<dateCode>-<courtCode>.json` or `<dateCode>-<courtCode>.xlsx`

E.g. `20210415-DCMC.xlsx` or `20210415-DCMC.json`

## Config

Quick and Dirty. `judix` config items are defined in `package.json`:

```js
"_output": "./output",
"_delay":500,
```

`_output`:  the default *output* dir to store the excel/json files. it can be relative path(to the project) or absolute path. 

`_delay` : the default number of `ms` to delay the request to the source server.

## Author

Copyright &copy; Simon CHAM