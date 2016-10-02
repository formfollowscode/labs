const nextId = (function makeNextId() {
  let counter = 0;
  return (prefix = '') => prefix + counter++;
})();
