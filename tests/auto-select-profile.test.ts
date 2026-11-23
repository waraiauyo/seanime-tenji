import assert from "node:assert/strict"
import test from "node:test"
import type { Anime_AutoSelectProfile } from "../src/api/generated/types.ts"
import {
    buildAutoSelectProfileUpdate,
    getStreamPreferredResolutions,
    hasSavedAutoSelectProfile,
    normalizeAutoSelectPreference,
} from "../src/lib/auto-select-profile.ts"

// What the server returns when no profile has been saved yet.
const unsavedProfile = {
    dbId: 0,
    providers: null,
    releaseGroups: null,
    resolutions: null,
    multipleAudioPreference: "",
    multipleSubsPreference: "",
    batchPreference: "",
    bestReleasePreference: "",
    requireLanguage: false,
    requireCodec: false,
    requireSource: false,
} as unknown as Anime_AutoSelectProfile

const savedProfile: Anime_AutoSelectProfile = {
    dbId: 3,
    providers: ["nyaa"],
    releaseGroups: ["SubsPlease"],
    resolutions: ["720p"],
    excludeTerms: ["CamRip"],
    preferredLanguages: ["fr"],
    multipleAudioPreference: "avoid",
    multipleSubsPreference: "neutral",
    batchPreference: "prefer",
    bestReleasePreference: "neutral",
    requireLanguage: true,
    requireCodec: false,
    requireSource: false,
    minSeeders: 5,
}

test("unset or unknown preferences read as neutral", () => {
    assert.equal(normalizeAutoSelectPreference(""), "neutral")
    assert.equal(normalizeAutoSelectPreference(undefined), "neutral")
    assert.equal(normalizeAutoSelectPreference("sometimes"), "neutral")
    assert.equal(normalizeAutoSelectPreference("only"), "only")
})

test("a profile counts as saved only once it has a database id", () => {
    assert.equal(hasSavedAutoSelectProfile(undefined), false)
    assert.equal(hasSavedAutoSelectProfile(unsavedProfile), false)
    assert.equal(hasSavedAutoSelectProfile(savedProfile), true)
})

test("changing a preference keeps every other field of a saved profile", () => {
    const result = buildAutoSelectProfileUpdate(savedProfile, { multipleSubsPreference: "prefer" }, ["1080p"])

    assert.deepEqual(result, { ...savedProfile, multipleSubsPreference: "prefer" })
})

test("the first save seeds the preferred streaming resolution", () => {
    const result = buildAutoSelectProfileUpdate(unsavedProfile, { multipleSubsPreference: "only" }, ["1080p"])

    assert.deepEqual(result.resolutions, ["1080p"])
    assert.equal(result.multipleSubsPreference, "only")
    assert.equal(result.multipleAudioPreference, "neutral")
    assert.equal(result.batchPreference, "neutral")
    assert.equal(result.bestReleasePreference, "neutral")
    assert.equal(result.dbId, 0)
})

test("a missing profile still produces a complete one", () => {
    const result = buildAutoSelectProfileUpdate(undefined, { multipleAudioPreference: "prefer" }, ["720p"])

    assert.deepEqual(result, {
        dbId: 0,
        resolutions: ["720p"],
        multipleAudioPreference: "prefer",
        multipleSubsPreference: "neutral",
        batchPreference: "neutral",
        bestReleasePreference: "neutral",
        requireLanguage: false,
        requireCodec: false,
        requireSource: false,
    })
})

test("a saved profile without resolutions is not given any", () => {
    const profile = { ...savedProfile, resolutions: [] }
    const result = buildAutoSelectProfileUpdate(profile, { multipleSubsPreference: "prefer" }, ["1080p"])

    assert.deepEqual(result.resolutions, [])
})

test("fallback resolutions come from the enabled streaming modes", () => {
    assert.deepEqual(getStreamPreferredResolutions(undefined), ["1080p"])
    assert.deepEqual(getStreamPreferredResolutions({
        torrentstreamSettings: { enabled: true, preferredResolution: "720p" },
        debridSettings: { enabled: false, streamPreferredResolution: "480p" },
    }), ["720p"])
    assert.deepEqual(getStreamPreferredResolutions({
        torrentstreamSettings: { enabled: true, preferredResolution: "1080p" },
        debridSettings: { enabled: true, streamPreferredResolution: "1080p" },
    }), ["1080p"])
    assert.deepEqual(getStreamPreferredResolutions({
        torrentstreamSettings: { enabled: true, preferredResolution: "" },
        debridSettings: { enabled: true, streamPreferredResolution: "720p" },
    }), ["720p"])
})
