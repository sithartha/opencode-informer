// Force DEVELOPMENT_TEAM onto every build configuration.
//
// `expo prebuild` does not reliably carry `ios.appleTeamId` into the generated Xcode
// project (and `ios/` is gitignored, so a manual edit would be lost), which left the
// app and the Live Activity extension without a signing team and broke local builds.
// This plugin pins the team from `ios.appleTeamId` for both targets.
const { withXcodeProject } = require("@expo/config-plugins")

function withDevelopmentTeam(config) {
  return withXcodeProject(config, (cfg) => {
    const team = cfg.ios?.appleTeamId
    if (!team) return cfg
    const configurations = cfg.modResults.pbxXCBuildConfigurationSection()
    for (const key of Object.keys(configurations)) {
      const entry = configurations[key]
      if (entry && entry.buildSettings) entry.buildSettings.DEVELOPMENT_TEAM = team
    }
    return cfg
  })
}

module.exports = withDevelopmentTeam
