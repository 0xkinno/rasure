#!/bin/sh
# Run once per clone, locally AND in any cloud session, before the first commit.
# The identity is fixed: 0xkinno is the only author and committer. KINNO_EMAIL may override the
# default GitHub noreply address, but the name never changes.
set -e
git config user.name "0xkinno"
git config user.email "${KINNO_EMAIL:-140649226+0xkinno@users.noreply.github.com}"
git config core.hooksPath scripts/hooks
git config commit.gpgsign false
echo "author locked to 0xkinno; hooks active"
