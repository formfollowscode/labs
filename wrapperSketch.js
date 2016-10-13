/*
input:
{paramId, expectsCollection, expectsRepeat, value}

expectsCollection:
                       TRUE            FALSE
1               |      [1]         |      1
[1]             |      [1]         |      1
1 + 2           |      [1,2]       |     [1,2]
[1, 2] + 2      |  [[1, 2],[2]]    |    [1,2,2]
[1, 2] + [1, 2] |  [[1,2],[1,2]]   |   [1,2,1,2]
*/

let inputs = [];

let isWrapped = (val) => Array.isArray(val);
let getValue = (input) => input.value;

let wrap = (val) => [val];
let flatten = (list) => list.reduce((list, elem) => {
  return list.concat(Array.isArray(elem) ? flatten(elem) : elem);
}, []);
