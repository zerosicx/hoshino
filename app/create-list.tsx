import { useLocalSearchParams, useRouter } from "expo-router";
import CreateListDialog from "@/components/CreateListDialog";
import { useAddToList, useCreateList } from "@/hooks/useLists";

/**
 * Names a new list. Opened with `entryId` and `word` when a word is waiting
 * to go into it, in which case the word is added and the caller gets the
 * screen back; otherwise the new list is opened.
 */
export default function CreateListScreen() {
  const router = useRouter();
  const { entryId, word } = useLocalSearchParams<{
    entryId?: string;
    word?: string;
  }>();
  const createList = useCreateList();
  const { add } = useAddToList();

  const onCreate = async (name: string) => {
    const created = await createList(name);
    if (!created) return;

    if (entryId) {
      await add(Number(entryId), word ?? "", created);
      router.back();
      return;
    }

    // One action, not back() then push(): the push would run before the back
    // had applied and land the list in a second copy of the tabs. dismissTo
    // pops this dialog and opens the list inside the Lists stack already there.
    router.dismissTo(`/lists/${created.id}`);
  };

  return <CreateListDialog onCancel={() => router.back()} onCreate={onCreate} />;
}
