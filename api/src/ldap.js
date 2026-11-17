const passport = require("passport");
const LdapStrategy = require("passport-ldapauth").Strategy;
const config = require("./config");

function setupPassport() {
  passport.use(
    new LdapStrategy({
      server: {
        url: config.ldap.url,
        bindDN: config.ldap.bindDN,
        bindCredentials: config.ldap.bindCredentials,
        searchBase: config.ldap.searchBase,
        searchFilter: config.ldap.searchFilter,
        searchAttributes: config.ldap.searchAttributes,
        timeout: config.ldap.timeout,
        connectTimeout: config.ldap.connectTimeout,
      },
      usernameField: "username",
      passwordField: "password",
    })
  );

  console.log(`[LDAP] strategy configured for ${config.ldap.url}`);
}

module.exports = { setupPassport, passport };