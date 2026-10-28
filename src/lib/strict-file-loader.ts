import { file, type Loader } from 'astro/loaders';

// 内置 file loader 会记录部分读取错误后返回；内容出错时应阻止构建。
export function strictFile(filename: string): Loader {
  const loader = file(filename);
  return {
    ...loader,
    load(context) {
      const logger = new Proxy(context.logger, {
        get(target, property) {
          if (property === 'error') return (message: string) => { throw new Error(message); };
          const value = Reflect.get(target, property);
          return typeof value === 'function' ? value.bind(target) : value;
        }
      });
      return loader.load({ ...context, logger });
    }
  };
}