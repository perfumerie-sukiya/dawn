module.exports = function stripBomLoader(source) {
  return source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
};
