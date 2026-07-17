import { getCollection, type CollectionEntry } from "astro:content";

export type BlueNote = CollectionEntry<"blueNotes">;

export const getBlueNotes = async (): Promise<BlueNote[]> => {
  const notes = await getCollection("blueNotes", ({ data }) => !data.draft);

  return notes.sort((left, right) => {
    const dateDifference =
      right.data.publishedAt.getTime() - left.data.publishedAt.getTime();
    if (dateDifference !== 0) return dateDifference;

    const noteDifference = right.data.note.localeCompare(left.data.note, "en", {
      numeric: true,
    });

    return noteDifference !== 0
      ? noteDifference
      : right.id.localeCompare(left.id);
  });
};

export const blueNoteHref = (note: BlueNote): string => `/blog/${note.id}/`;

export const formatBlueNoteDate = (date: Date): string =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
