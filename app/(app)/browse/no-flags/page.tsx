import { redirect } from "next/navigation";

export default async function NoFlagsPage() {
  redirect("/browse/low-scores");
}
