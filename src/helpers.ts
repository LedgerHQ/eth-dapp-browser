import { NextRouter } from "next/router";

export function getQueryVariable(
  name: string,
  router: NextRouter,
  formater?: (variable: string) => any
): string | undefined {
  const queryVariable = router.query[name];
  if (queryVariable) {
    const value = !Array.isArray(queryVariable)
      ? queryVariable
      : queryVariable[0];
    if (formater) {
      return formater(value);
    }
    return value;
  }
  return undefined;
}

export function getQueryArray(
  name: string,
  router: NextRouter
): string[] | undefined {
  const queryVariable = router.query[name];
  if (queryVariable) {
    return Array.isArray(queryVariable) ? queryVariable : [queryVariable];
  }
  return undefined;
}
