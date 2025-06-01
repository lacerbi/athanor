#!/bin/bash
# AI Summary: Validates DCO (Developer Certificate of Origin) signatures in PR commits.
# Checks for 'Signed-off-by:' lines in all non-merge commits within a PR range.
set -eo pipefail

echo "Verifying DCO for commits in this PR"
echo "Base branch (target): ${GITHUB_BASE_REF}"
echo "Head SHA (PR head): ${GITHUB_SHA}"

if [ -z "$GITHUB_BASE_REF" ]; then
  echo "Error: GITHUB_BASE_REF is not set. This script must run in a GitHub Action PR context."
  exit 1
fi

if [ -z "$GITHUB_SHA" ]; then
  echo "Error: GITHUB_SHA is not set. This script must run in a GitHub Action PR context."
  exit 1
fi

# actions/checkout@vX with fetch-depth: 0 is required for this to have full history.
# This ensures origin/$GITHUB_BASE_REF exists and has history to compare against.
# The range lists commits in $GITHUB_SHA that are not in origin/$GITHUB_BASE_REF.
COMMIT_RANGE="origin/$GITHUB_BASE_REF..$GITHUB_SHA"

echo "Checking commits in range: $COMMIT_RANGE"

# Exclude merge commits from the PR itself, only check original authored commits.
# First, get all commit hashes in the range.
# Then, for each hash, retrieve its full commit message separately to correctly handle multi-line messages.
# The trailing '--' ensures that $COMMIT_RANGE is not misinterpreted as a file name if it resembles one.
mapfile -t COMMIT_HASHES < <(git log "$COMMIT_RANGE" --no-merges --format="%H" --)

if [ ${#COMMIT_HASHES[@]} -eq 0 ]; then
  echo "No new non-merge commits found in range $COMMIT_RANGE. Skipping DCO check."
  # If GITHUB_HEAD_REF == GITHUB_BASE_REF (e.g. push to main itself, not a PR to main), this can be empty.
  # For a PR, there should usually be commits.
  exit 0
fi

echo "--------------------------------------------------------------------------------"
echo "Checking for 'Signed-off-by:' in commit messages..."
echo "--------------------------------------------------------------------------------"

ALL_SIGNED=true

for HASH in "${COMMIT_HASHES[@]}"; do
  # Fetch the full commit message for the current hash
  MESSAGE=$(git log -1 --format=%B "$HASH")
  
  if [ -z "$HASH" ]; then # Should ideally not happen with the new logic, but as a safeguard
    echo "Error: Encountered an empty HASH in COMMIT_HASHES array. Skipping."
    ALL_SIGNED=false
    continue
  fi
  
  COMMIT_SUMMARY=$(git show --no-patch --format="%h %s" "$HASH") # Short hash and subject for display

  # Check for 'Signed-off-by:' allowing for leading spaces.
  if echo "$MESSAGE" | grep -q -E '^[[:space:]]*Signed-off-by:'; then
    echo "✅ DCO found for commit $COMMIT_SUMMARY"
  else
    echo "❌ DCO NOT FOUND for commit $COMMIT_SUMMARY"
    echo "   Full commit message (abbreviated for log):"
    echo "$MESSAGE" | head -n 10 | awk '{print "     " $0}' # Show first 10 lines
    if [ $(echo "$MESSAGE" | wc -l) -gt 10 ]; then
        echo "     ..."
    fi
    echo "--------------------------------------------------------------------------------"
    ALL_SIGNED=false
  fi
done

echo "--------------------------------------------------------------------------------"
if $ALL_SIGNED; then
  echo "All relevant commits are DCO signed. 🎉"
  exit 0
else
  echo "Error: Not all commits are DCO signed. Please amend your commits (e.g., 'git commit --amend --signoff') or add a new signed-off commit."
  echo "See CONTRIBUTING.md for how to sign off commits."
  exit 1
fi
