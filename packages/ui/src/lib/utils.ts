import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createContext<ContextValue extends Record<string, unknown>>(rootComponentName: string) {
  const Context = React.createContext<ContextValue | null>(null);

  function Provider(props: ContextValue & { children: React.ReactNode }) {
    const { children, ...context } = props;
    const value = React.useMemo(() => context, Object.values(context)) as ContextValue;
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  function useContext(consumerName: string) {
    const context = React.useContext(Context);
    if (context === null) {
      throw new Error(
        `\`${consumerName}\` must be used within \`${rootComponentName}\``
      );
    }
    return context;
  }

  Provider.displayName = `${rootComponentName}Provider`;
  return [Provider, useContext] as const;
}

export const visuallyHidden = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: '0',
} as const;

export function createPolymorphicComponent<
  Props extends Record<string, unknown>,
  DefaultElement extends React.ElementType
>(defaultElement: DefaultElement) {
  return function Component<Element extends React.ElementType = DefaultElement>(
    props: Props & { as?: Element } & Omit<
      React.ComponentPropsWithoutRef<Element>,
      keyof Props | 'as'
    >
  ) {
    const { as: Component = defaultElement, ...rest } = props;
    return <Component {...rest} />;
  };
}