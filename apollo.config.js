module.exports = {
  client: {
    service: {
      name: 'github',
      url: 'https://api.github.com/graphql',
      headers: {
        authorization: 'Bearer 766ce7a7504c2b3304ed591df5aaf62291a1ecaa'
      },
      // optional headers
      // optional disable SSL validation check
      skipSSLValidation: true
    }
  }
};
