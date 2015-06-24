# Infected设计
## 数据库
1. 数据库
  __admin__      管理员：root 密码：123456
  __infecteddb__ 用户名：soap 密码：5102paoS

1. 集合（表）
- __users__
```
  {
    uname   : string,
    passwd  : string,
    regdate : timestamp
  }
```

- __profiles__
```
  {
    uname    : string,
    killed   : integer,
    dead     : boolean,
    online   : boolean,
    position : { x : double, y : double },
    root     : { x : double, y : double },
    spore    : [
      { x : double, y : double},
      { x : double, y : double},
      { x : double, y : double},
      { x : double, y : double},
      { x : double, y : double}
    ]
  }
```

- system.indexes
- system.users
