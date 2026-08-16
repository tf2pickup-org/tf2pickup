const depsGroupTitle = 'Dependencies'

function batchDependencies(context) {
  // The default finalizeContext (which we override below) sets this so the
  // version heading renders as a compare link. previousTag/currentTag are
  // already provided by @release-it/conventional-changelog.
  if (typeof context.linkCompare !== 'boolean' && context.previousTag && context.currentTag) {
    context.linkCompare = true
  }

  const depCommits = []

  for (const group of context.commitGroups) {
    group.commits = group.commits.filter(commit => {
      if (commit.scope === 'deps') {
        depCommits.push(commit)
        return false
      }
      return true
    })
  }

  context.commitGroups = context.commitGroups.filter(group => group.commits.length > 0)

  if (depCommits.length > 0) {
    for (const commit of depCommits) {
      // Drop the "deps" scope prefix and Renovate boilerplate so each bump reads
      // e.g. "marked to v18.0.7" instead of "**deps:** update dependency marked to v18.0.7".
      commit.scope = ''
      commit.subject = commit.subject.replace(/^update dependency /, '').replace(/^update /, '')
    }

    depCommits.sort((a, b) => a.subject.localeCompare(b.subject))

    context.commitGroups.push({
      title: depsGroupTitle,
      commits: depCommits,
    })
  }

  return context
}

export default {
  git: {
    commitMessage: 'chore: release version ${version}',
  },
  github: {
    release: true,
  },
  npm: {
    publish: false,
  },
  plugins: {
    '@release-it/conventional-changelog': {
      preset: 'angular',
      infile: 'CHANGELOG.md',
      writerOpts: {
        finalizeContext: batchDependencies,
      },
    },
  },
}
