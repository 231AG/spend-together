// Navigating anywhere else by link must close an open route dialog: a slot keeps its
// last content on soft navigation unless something matches, so this match renders null.
export default function ModalCatchAll() {
  return null;
}
