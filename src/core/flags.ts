import { FlagLoader, FlagLoaderType } from '/types.d.ts'

export const boolean = (): FlagLoaderType<boolean> => {
  return () => Boolean(true)
}

export const string = (): FlagLoaderType<string> => {
  return () => String()
}

export const number = (): FlagLoaderType<number> => {
  return () => Number()
}

const a = {
  test: boolean()
}

const result = a.test({})