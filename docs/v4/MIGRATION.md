# 迁移（3.7.0）

存档版本号仍是 3。新字段都是可选的：`element`、`bin`、`autoGuard`、`v4LessonGranted`、`gearTrials`、`gearFight`、`imprintChapter`。

旧物品没有 `element` 就是无属性，没有 `bin` 就按原来的坐标或临时区解释。不会把高等级武器自动挪到主手，也不会清空背包。

第 11 关后的教学衬甲在准备界面第一次画出穿戴区时发放，并记下 `v4LessonGranted`，不重复给。旧的 A10 扩容补偿逻辑没有改。

大于 6×6 的旧背包仍按 3.6.5 的规则收成 6×6，界外装备进临时区。
