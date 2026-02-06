// 目前 parseTraceToCallTree 已经覆盖 callTracer。
// 这个文件留作扩展点：未来若要支持 parity trace / structLogs -> call tree，可在这里实现。

export const CALL_TREE_BUILDER_VERSION = "v0-callTracer";
