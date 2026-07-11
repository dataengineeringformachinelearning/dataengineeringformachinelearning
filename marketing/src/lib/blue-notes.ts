import { getCollection, type CollectionEntry } from "astro:content";

export type BlueNote = CollectionEntry<"blueNotes">;

export const getBlueNotes = async (): Promise<BlueNote[]> => {
  const notes = await getCollection("blueNotes", ({ data }) => !data.draft);

  return notes.sort(
    (left, right) =>
      right.data.publishedAt.getTime() - left.data.publishedAt.getTime(),
  );
};

export const blueNoteHref = (note: BlueNote): string => `/blog/${note.id}/`;

export const formatBlueNoteDate = (date: Date): string =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
