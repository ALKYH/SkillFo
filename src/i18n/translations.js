export const SUPPORTED_LOCALES = [
  { id: "zh-CN", label: "中文" },
  { id: "en-US", label: "English" }
];

export const translations = {
  "zh-CN": {
    app: {
      brandKicker: "SKILLFO PRODUCTIVITY CONSOLE",
      brandSubline: "你的技能创作空间",
      navAria: "主导航",
      prompt: "user@skillfo:~$",
      themeLabel: "主题",
      languageLabel: "语言",
      tmux: {
        session: "session:skillfo",
        host: "host:main",
        theme: "theme",
        locale: "lang"
      },
      commands: {
        home: "boot --page home --profile focus",
        workspace: "workspace open --mode deep-work",
        forge: "forge run --prototype rapid",
        profile: "profile open --user current",
        docs: "docs index --scope all",
        fallback: "help --all"
      }
    },
    nav: {
      home: "首页",
      workspace: "工作区",
      forge: "工坊",
      docs: "文档"
    },
    login: {
      identifierNotTrim: "请输入用户名/邮箱",
      passwordShort: "密码至少四个字符",
      loginFail: "登录失败",
      registerFail: "注册失败",
      userLogin: "用户登录",
      authKicker: "登录",
      signIn: "登录到SkillFo",
      registerTitle: "注册 SkillFo 账号",
      modeLogin: "登录",
      modeRegister: "注册",
      name: "用户名/邮箱",
      namePlaceholder: "示例:you@skillfo.dev",
      password: "密码",
      passwordPlaceholder: "至少四个字符",
      registerUsername: "用户名",
      registerUsernamePlaceholder: "至少 3 个字符",
      registerUsernameRequired: "请输入用户名",
      registerUsernameTooShort: "用户名至少三个字符",
      registerEmail: "邮箱",
      registerEmailPlaceholder: "示例:you@skillfo.dev",
      registerEmailRequired: "请输入邮箱",
      registerEmailInvalid: "邮箱格式不正确",
      registerDisplayName: "显示名称(可选)",
      registerDisplayNamePlaceholder: "示例:Skill Builder",
      registerPassword: "密码",
      registerPasswordPlaceholder: "至少六个字符",
      registerPasswordShort: "注册密码至少六个字符",
      registerPasswordConfirm: "确认密码",
      registerPasswordConfirmPlaceholder: "再次输入密码",
      registerPasswordNotMatch: "两次输入的密码不一致",
      authHint: "使用后端真实账号登录。示例账号: craftpilot / skillfo123",
      registerHint: "注册后将自动登录，并同步启用工作区与工坊云端能力。",
      cancel: "取消",
      signingIn: "登录中...",
      signInBtn: "登录",
      registering: "注册中...",
      registerBtn: "创建账号"
    },
    home: {
      sectionTag: "生产力操作界面",
      title: "保持心流，持续交付",
      copy:
        "一个基于可视化节点的效率中枢，覆盖规划、执行与知识沉淀。",
      actionWorkspace: "进入工作区",
      actionForge: "打开工坊",
      quickTitle: "$ 快速开始",
      systemTitle: "$ 系统状态",
      quickLines: [
        "plan --today --focus=2h",
        "capture --idea --tag=prototype",
        "sync --workspace --team",
        "ship --checklist --safe"
      ],
      statusFeed: [
        "[OK] 工作区已跨设备同步",
        "[RUN] 今日专注时段已生成",
        "[OK] 知识图谱已更新",
        "[WARN] 2 篇文档待审阅"
      ],
      inspector: {
        command: "$ workspace -u current --list-files",
        meta: "当前用户工作区文件（ls -l 风格）",
        jumpDocs: "跳转文档主内容",
        loading: "加载工作区文件中...",
        loadFailed: "加载工作区文件失败。",
        empty: "暂无工作区文件",
        signInToLoad: "登录后查看你的工作区文件",
        columns: {
          mode: "MODE",
          owner: "OWNER",
          group: "GROUP",
          size: "SIZE",
          time: "TIME",
          path: "PATH"
        },
        propertiesTitle: "属性栏",
        labels: {
          file: "文件",
          type: "类型",
          mode: "权限",
          description: "说明"
        },
        actionsTitle: "操作栏",
        actions: {
          open: "打开文件",
          preview: "预览",
          copyPath: "复制路径",
          goWorkspace: "进入工作区",
          openDocsMain: "查看文档主内容"
        },
        fileTypes: {
          reactPage: "React 页面",
          stylesheet: "样式表",
          localization: "本地化"
        },
        descriptions: {
          workspace: "工作区主编辑与执行界面",
          home: "主页入口与导航聚合",
          docs: "命令文档主内容页面",
          styles: "全局样式与终端视觉系统",
          i18n: "多语言文案和词条映射"
        }
      }
    },
    workspace: {
      sectionTag: "工作区",
      title: "执行焦点网格",
      copy: "保持当前任务可见，减少上下文切换，用终端式反馈推进每次会话。",
      meterTitle: "$ 专注度计量",
      lanes: [
        {
          title: "进行中",
          items: ["深度工作冲刺", "关键缺陷排查", "站会纪要整理"]
        },
        {
          title: "下一步",
          items: ["命令面板重构", "集成日志复核", "接口说明草稿"]
        },
        {
          title: "后续",
          items: ["动效细节打磨", "长文档清理", "历史模板归档"]
        }
      ],
      meters: [
        { name: "专注度", value: 82 },
        { name: "上下文完整度", value: 69 },
        { name: "推进势能", value: 91 }
      ]
    },
    forge: {
      sectionTag: "工坊",
      title: "实验工作流",
      copy: "把想法拆成短循环。每个模块都围绕快速迭代、清晰反馈与低摩擦切换。",
      modulesTitle: "$ 活跃模块",
      pipeline: [
        { step: "收集", text: "从当前上下文捕获想法和片段。" },
        { step: "成形", text: "把原始笔记转成可执行任务和提示词。" },
        { step: "原型", text: "在受控范围内快速落地验证。" },
        { step: "发布", text: "交付、观察，并沉淀可复用知识。" }
      ],
      modules: ["提示词实验室", "流程编排器", "动效沙箱", "片段生成器"]
    },
    docs: {
      sectionTag: "文档",
      title: "命令知识库",
      copy:
        "提供轻量命令索引、模式说明与模板示例，服务于全流程复用。",
      tableTitle: "$ 命令参考",
      columns: ["命令", "说明", "示例"],
      rows: [
        {
          command: "init --workspace",
          desc: "创建新的工作区骨架",
          sample: "skillfo init --workspace studio"
        },
        {
          command: "note --capture",
          desc: "按标签捕获想法笔记",
          sample: "skillfo note --capture --tag design"
        },
        {
          command: "sync --cloud",
          desc: "同步本地与云端会话",
          sample: "skillfo sync --cloud --safe"
        },
        {
          command: "ship --report",
          desc: "生成发布检查报告",
          sample: "skillfo ship --report today"
        }
      ]
    },
    profile: {
      loadingState: "加载用户状态...",
      userCenterTag: "用户中心",
      signInRequiredTitle: "请先登录",
      signInHint:
        "点击 tmux 状态栏右上角高亮用户名位置即可登录，登录后会自动加载个人主页。",
      userHomepageTag: "用户主页",
      joinedLabel: "加入于",
      sessionExpiresLabel: "会话到期",
      backend: {
        label: "数据源",
        remote: "远程后端",
        unavailable: "后端不可用"
      },
      actions: {
        refreshAccount: "刷新账号",
        refreshHomeData: "刷新主页数据",
        loading: "加载中...",
        signOut: "退出登录"
      },
      stats: {
        templates: "模板",
        packs: "节点包",
        likes: "点赞",
        downloads: "下载",
        followers: "粉丝",
        following: "关注"
      },
      sections: {
        profile: "个人资料",
        preferences: "偏好设置",
        recentActivity: "最近活动",
        myTemplates: "我的模板"
      },
      form: {
        displayName: "显示名称",
        bio: "简介",
        location: "所在地",
        website: "网站",
        company: "组织",
        saveProfile: "保存资料"
      },
      preferences: {
        defaultVisibility: "默认可见性",
        defaultSort: "默认排序",
        interfaceLanguage: "界面语言",
        emailNotifications: "邮件通知",
        save: "保存偏好"
      },
      options: {
        visibility: {
          public: "公开",
          private: "私有"
        },
        sort: {
          latest: "最近更新",
          trending: "趋势",
          popular: "最受点赞",
          downloads: "下载量"
        },
        language: {
          zhCN: "中文",
          enUS: "English"
        }
      },
      table: {
        title: "名称",
        visibility: "状态",
        stats: "数据",
        likesShort: "赞",
        downloadsShort: "下"
      },
      empty: {
        noActivity: "暂无活动",
        noTemplates: "暂无模板"
      },
      notice: {
        profileSaved: "资料已保存",
        preferencesSaved: "偏好已更新"
      },
      errors: {
        loadHomeData: "加载用户主页数据失败。",
        saveProfile: "保存失败",
        savePreferences: "更新失败"
      }
    },
    forgePage: {
      sectionTag: "工坊市场",
      title: "节点库与组合模板",
      copy:
        "统一检索官方与用户共享内容，明确展示不同功能的 SKILLFO.md 模板与不同功能的预制节点库，支持分类、来源、类型、复杂度、节点区间、标签和排序规则。",
      searchPlaceholder: "搜索标题、作者、标签、描述...",
      reset: "重置",
      backend: {
        connected: "后端: 已连接",
        unavailable: "后端: 不可用"
      },
      results: "结果",
      page: "页码",
      sync: "同步",
      filters: {
        category: "分类",
        source: "来源",
        contentType: "内容类型",
        complexity: "复杂度",
        sort: "排序",
        pageSize: "每页",
        minNodes: "最小节点数",
        maxNodes: "最大节点数"
      },
      options: {
        common: {
          all: "全部"
        },
        source: {
          official: "官方",
          user: "用户"
        },
        type: {
          template: "模板",
          nodePack: "节点包"
        },
        complexity: {
          beginner: "新手",
          intermediate: "中级",
          advanced: "高级"
        },
        sort: {
          latest: "最新",
          trending: "近期热门",
          popular: "最受点赞",
          downloads: "最多下载",
          nodes: "节点数",
          name: "名称 A-Z"
        }
      },
      pills: {
        query: "关键词",
        category: "分类",
        source: "来源",
        complexity: "复杂度",
        type: "类型",
        minNodes: "最小节点数",
        maxNodes: "最大节点数"
      },
      metrics: {
        author: "作者",
        category: "分类",
        functionFocus: "功能",
        deliverable: "产出",
        complexity: "复杂度",
        nodes: "节点",
        likes: "点赞",
        downloads: "下载"
      },
      workshop: {
        skillfoTemplates: "SKILLFO.md 模板",
        presetNodeLibraries: "预制节点库",
        skillfoByFunction: "模板功能:",
        nodeLibraryByFunction: "节点库功能:"
      },
      use: "使用",
      showing: "当前显示",
      prev: "上一页",
      next: "下一页",
      loading: "加载工坊列表中...",
      noResults: "没有匹配结果，请尝试放宽筛选条件。",
      errors: {
        loadFailed: "加载工坊列表失败。"
      }
    },
    workspacePage: {
      folder: {
        prefix: "文件夹"
      },
      toolbar: {
        title: "工作区工具栏",
        view: "视图",
        left: "左侧",
        split: "分屏",
        right: "右侧",
        document: "SKILL.MD",
        noHistory: "无可撤销",
        undo: "撤销",
        selected: "选中",
        liveMappingTitle: "实时映射状态",
        liveMappingOn: "实时映射: 开",
        liveMappingOff: "实时映射: 关"
      },
      canvas: {
        title: "可视化技能文档编排",
        copy: "通过节点编排组织技能文档，实时生成结构化 SKILL.md",
        docComposerCopy: "通过节点编排组织技能文档，实时生成结构化 SKILL.md"
      },
      actions: {
        copy: "复制",
        paste: "粘贴",
        duplicate: "复制节点",
        connectSelected: "连接所选",
        deleteNode: "删除节点",
        autoLayout: "自动布局",
        selecting: "框选中",
        folderSelect: "文件夹框选",
        unpackFolder: "解散文件夹",
        reset: "重置",
        hotkeys: "快捷键: Ctrl/Cmd+C V D K Z / Delete / 方向键微调"
      },
      sidebar: {
        leftTabs: "左侧标签",
        nodeLibrary: "节点库",
        nodeTemplates: "节点模板"
      },
      library: {
        searchPlaceholder: "搜索节点库...",
        groups: {
          builtin: "内置节点",
          imported: "用户导入",
          downloaded: "工坊下载"
        },
        add: "添加",
        noMatches: "无匹配结果",
        nodes: "节点",
        downloads: "下载",
        noImportedPacks: "暂无导入节点包",
        signInHintForImported: "登录后查看你导入的节点包",
        loading: "加载中...",
        noDownloadedPacks: "暂无下载节点包"
      },
      templates: {
        copy: "选择预设模板并应用到画布",
        apply: "应用",
        hint: "拖拽空白区域可框选并封装到文件夹"
      },
      properties: {
        node: "节点属性",
        folder: "文件夹属性",
        nodeName: "节点名称",
        nodeType: "节点类型",
        positionX: "X",
        positionY: "Y",
        folderName: "文件夹名称",
        tone: "风格",
        tones: {
          cyan: "冷蓝",
          amber: "琥珀",
          green: "青绿",
          pink: "洋红"
        },
        nodeCount: "节点数",
        empty: "未选中节点或文件夹"
      },
      preview: {
        title: "SKILL.md 生成预览",
        copy: "节点变更会实时反映到右侧结构化文档",
        path: "skill@composer:~/SKILL.md",
        modeGroup: "渲染模式",
        modeRaw: "原始",
        modeRendered: "渲染",
        colorMapOn: "颜色映射: 开",
        colorMapOff: "颜色映射: 关",
        editorTraditional: "传统模式",
        editorVim: "Vim 模式",
        editorTraditionalStatus: "编辑: 传统",
        editorVimInsert: "编辑: Vim 插入",
        editorVimNormal: "编辑: Vim 普通",
        liveOn: "实时映射: 开",
        liveOff: "实时映射: 关",
        syncOnce: "同步一次",
        copied: "已复制",
        copy: "复制",
        rawAria: "Markdown 原始文本",
        aria: "Markdown 预览",
        lines: "行",
        chars: "字符",
        auto: "自动",
        manual: "手动"
      }
    }
  },
  "en-US": {
    app: {
      brandKicker: "SKILLFO PRODUCTIVITY CONSOLE",
      brandSubline: "High-contrast flow tools for makers",
      navAria: "Primary navigation",
      prompt: "user@skillfo:~$",
      themeLabel: "Theme",
      languageLabel: "Language",
      tmux: {
        session: "session:skillfo",
        host: "host:main",
        theme: "theme",
        locale: "lang"
      },
      commands: {
        home: "boot --page home --profile focus",
        workspace: "workspace open --mode deep-work",
        forge: "forge run --prototype rapid",
        profile: "profile open --user current",
        docs: "docs index --scope all",
        fallback: "help --all"
      }
    },
    nav: {
      home: "Home",
      workspace: "Workspace",
      forge: "Forge",
      docs: "Docs"
    },
    login: {
      identifierNotTrim: "Please enter username or email.",
      passwordShort: "Password must be at least 4 characters.",
      loginFail: "Login failed.",
      registerFail: "Registration failed.",
      userLogin: "User Login",
      authKicker: "Login",
      signIn: "Sign in to SkillFo",
      registerTitle: "Create a SkillFo account",
      modeLogin: "Sign in",
      modeRegister: "Register",
      name: "Username / Email",
      namePlaceholder: "For example: craftpilot or you@skillfo.dev",
      password: "Password",
      passwordPlaceholder: "At least 4 characters",
      registerUsername: "Username",
      registerUsernamePlaceholder: "At least 3 characters",
      registerUsernameRequired: "Username is required.",
      registerUsernameTooShort: "Username must be at least 3 characters.",
      registerEmail: "Email",
      registerEmailPlaceholder: "Example: you@skillfo.dev",
      registerEmailRequired: "Email is required.",
      registerEmailInvalid: "Email format is invalid.",
      registerDisplayName: "Display Name (Optional)",
      registerDisplayNamePlaceholder: "Example: Skill Builder",
      registerPassword: "Password",
      registerPasswordPlaceholder: "At least 6 characters",
      registerPasswordShort: "Password must be at least 6 characters.",
      registerPasswordConfirm: "Confirm Password",
      registerPasswordConfirmPlaceholder: "Enter password again",
      registerPasswordNotMatch: "Passwords do not match.",
      authHint: "Sign in with real backend credentials. Demo: craftpilot / skillfo123",
      registerHint: "After registration, you'll be signed in automatically with cloud workspace/forge access.",
      cancel: "Cancel",
      signingIn: "Signing in...",
      signInBtn: "Sign in",
      registering: "Registering...",
      registerBtn: "Create Account"
    },
    home: {
      sectionTag: "PRODUCTIVITY OPERATING SURFACE",
      title: "BUILD IN FLOW",
      copy:
        "A CLI-inspired hub for planning, execution, and knowledge capture. Designed with pure colors, ASCII decoration, and monitor-like depth.",
      actionWorkspace: "Enter Workspace",
      actionForge: "Open Forge",
      quickTitle: "$ quickstart",
      systemTitle: "$ system-feed",
      quickLines: [
        "plan --today --focus=2h",
        "capture --idea --tag=prototype",
        "sync --workspace --team",
        "ship --checklist --safe"
      ],
      statusFeed: [
        "[OK] Workspace synced across devices",
        "[RUN] Daily focus block generated",
        "[OK] Knowledge graph updated",
        "[WARN] 2 docs awaiting review"
      ],
      inspector: {
        command: "$ workspace -u current --list-files",
        meta: "Current user workspace files (ls -l style)",
        jumpDocs: "Jump to Docs Main",
        loading: "Loading workspace files...",
        loadFailed: "Failed to load workspace files.",
        empty: "No workspace files yet",
        signInToLoad: "Sign in to load your workspace files",
        columns: {
          mode: "MODE",
          owner: "OWNER",
          group: "GROUP",
          size: "SIZE",
          time: "TIME",
          path: "PATH"
        },
        propertiesTitle: "Properties",
        labels: {
          file: "File",
          type: "Type",
          mode: "Mode",
          description: "Description"
        },
        actionsTitle: "Actions",
        actions: {
          open: "Open",
          preview: "Preview",
          copyPath: "Copy Path",
          goWorkspace: "Go Workspace",
          openDocsMain: "Open Docs Main"
        },
        fileTypes: {
          reactPage: "React Page",
          stylesheet: "Stylesheet",
          localization: "Localization"
        },
        descriptions: {
          workspace: "Main workspace execution and editor view",
          home: "Home entry and navigation aggregation",
          docs: "Main command documentation page",
          styles: "Global styling and terminal visual system",
          i18n: "Localized copy and translation entries"
        }
      }
    },
    workspace: {
      sectionTag: "WORKSPACE",
      title: "Operational Focus Grid",
      copy:
        "Keep active work visible, reduce context switching, and drive each session with terminal-like clarity.",
      meterTitle: "$ focus-meter",
      lanes: [
        {
          title: "NOW",
          items: ["Deep focus sprint", "Critical bug triage", "Sprint standup note"]
        },
        {
          title: "NEXT",
          items: ["Refactor command palette", "Review integration logs", "Draft API notes"]
        },
        {
          title: "LATER",
          items: ["Design motion polish", "Long-form docs cleanup", "Archive old templates"]
        }
      ],
      meters: [
        { name: "Focus", value: 82 },
        { name: "Context", value: 69 },
        { name: "Momentum", value: 91 }
      ]
    },
    forge: {
      sectionTag: "FORGE",
      title: "Experiment Workshop",
      copy:
        "Build ideas in small loops. Every module is tuned for fast iteration, clear feedback, and low-friction transitions.",
      modulesTitle: "$ active-modules",
      pipeline: [
        { step: "Capture", text: "Collect ideas and snippets from active context." },
        { step: "Shape", text: "Turn raw notes into executable tasks and prompts." },
        { step: "Prototype", text: "Build quickly with constrained scope." },
        { step: "Ship", text: "Publish, measure, and retain knowledge." }
      ],
      modules: ["Prompt Lab", "Workflow Composer", "Motion Sandbox", "Snippet Generator"]
    },
    docs: {
      sectionTag: "DOCS",
      title: "Command Knowledge Base",
      copy:
        "A lean reference surface for commands, patterns, and reusable templates across your productivity flow.",
      tableTitle: "$ command-reference",
      columns: ["Command", "Description", "Example"],
      rows: [
        {
          command: "init --workspace",
          desc: "Create a fresh workspace skeleton",
          sample: "skillfo init --workspace studio"
        },
        {
          command: "note --capture",
          desc: "Capture idea notes with tags",
          sample: "skillfo note --capture --tag design"
        },
        {
          command: "sync --cloud",
          desc: "Sync local and remote sessions",
          sample: "skillfo sync --cloud --safe"
        },
        {
          command: "ship --report",
          desc: "Generate publish checklist report",
          sample: "skillfo ship --report today"
        }
      ]
    },
    profile: {
      loadingState: "Checking user state...",
      userCenterTag: "User Center",
      signInRequiredTitle: "Sign in required",
      signInHint:
        "Click the highlighted username area in the top-right tmux bar to sign in.",
      userHomepageTag: "User Homepage",
      joinedLabel: "Joined",
      sessionExpiresLabel: "Session expires",
      backend: {
        label: "Data source",
        remote: "Remote backend",
        unavailable: "Backend unavailable"
      },
      actions: {
        refreshAccount: "Refresh account",
        refreshHomeData: "Refresh home data",
        loading: "Loading...",
        signOut: "Sign out"
      },
      stats: {
        templates: "Templates",
        packs: "Packs",
        likes: "Likes",
        downloads: "Downloads",
        followers: "Followers",
        following: "Following"
      },
      sections: {
        profile: "Profile",
        preferences: "Preferences",
        recentActivity: "Recent activity",
        myTemplates: "My templates"
      },
      form: {
        displayName: "Display name",
        bio: "Bio",
        location: "Location",
        website: "Website",
        company: "Company",
        saveProfile: "Save profile"
      },
      preferences: {
        defaultVisibility: "Default visibility",
        defaultSort: "Default sort",
        interfaceLanguage: "Interface language",
        emailNotifications: "Email notifications",
        save: "Save preferences"
      },
      options: {
        visibility: {
          public: "Public",
          private: "Private"
        },
        sort: {
          latest: "Latest",
          trending: "Trending",
          popular: "Most liked",
          downloads: "Downloads"
        },
        language: {
          zhCN: "Chinese",
          enUS: "English"
        }
      },
      table: {
        title: "Title",
        visibility: "Visibility",
        stats: "Stats",
        likesShort: "Likes",
        downloadsShort: "Dl"
      },
      empty: {
        noActivity: "No activity yet",
        noTemplates: "No templates"
      },
      notice: {
        profileSaved: "Profile saved",
        preferencesSaved: "Preferences updated"
      },
      errors: {
        loadHomeData: "Failed to load user home data.",
        saveProfile: "Save failed",
        savePreferences: "Update failed"
      }
    },
    forgePage: {
      sectionTag: "Forge Marketplace",
      title: "Node Libraries & Combo Templates",
      copy:
        "Search official and user-shared content with explicit function-based SKILLFO.md templates and preset node libraries, with category, type, complexity, node range, tags, and ranking rules.",
      searchPlaceholder: "Search title, author, tags, description...",
      reset: "Reset",
      backend: {
        connected: "Backend: Connected",
        unavailable: "Backend: Unavailable"
      },
      results: "Results",
      page: "Page",
      sync: "Sync",
      filters: {
        category: "Category",
        source: "Source",
        contentType: "Content Type",
        complexity: "Complexity",
        sort: "Sort",
        pageSize: "Page size",
        minNodes: "Min nodes",
        maxNodes: "Max nodes"
      },
      options: {
        common: {
          all: "All"
        },
        source: {
          official: "Official",
          user: "User"
        },
        type: {
          template: "Template",
          nodePack: "Node Pack"
        },
        complexity: {
          beginner: "Beginner",
          intermediate: "Intermediate",
          advanced: "Advanced"
        },
        sort: {
          latest: "Latest",
          trending: "Trending",
          popular: "Most liked",
          downloads: "Most downloaded",
          nodes: "Node count",
          name: "Name A-Z"
        }
      },
      pills: {
        query: "Query",
        category: "Category",
        source: "Source",
        complexity: "Complexity",
        type: "Type",
        minNodes: "Min nodes",
        maxNodes: "Max nodes"
      },
      metrics: {
        author: "Author",
        category: "Category",
        functionFocus: "Function",
        deliverable: "Deliverable",
        complexity: "Complexity",
        nodes: "Nodes",
        likes: "Likes",
        downloads: "Downloads"
      },
      workshop: {
        skillfoTemplates: "SKILLFO.md Templates",
        presetNodeLibraries: "Preset Node Libraries",
        skillfoByFunction: "Template Function:",
        nodeLibraryByFunction: "Node Library Function:"
      },
      use: "Use",
      showing: "Showing",
      prev: "Prev",
      next: "Next",
      loading: "Loading forge listings...",
      noResults: "No results. Try broader filters.",
      errors: {
        loadFailed: "Failed to load Forge listings."
      }
    },
    workspacePage: {
      folder: {
        prefix: "Folder"
      },
      toolbar: {
        title: "Workspace Toolbar",
        view: "View",
        left: "Left",
        split: "Split",
        right: "Right",
        document: "SKILL.MD",
        noHistory: "No history",
        undo: "Undo",
        selected: "Selected",
        liveMappingTitle: "Live mapping status",
        liveMappingOn: "Live Mapping: ON",
        liveMappingOff: "Live Mapping: OFF"
      },
      canvas: {
        title: "Visual Skill Doc Composer",
        copy: "Compose skill documentation with nodes and generate structured SKILL.md in real time",
        docComposerCopy: "Compose skill documentation with nodes and generate structured SKILL.md in real time"
      },
      actions: {
        copy: "Copy",
        paste: "Paste",
        duplicate: "Duplicate",
        connectSelected: "Connect Selected",
        deleteNode: "Delete Node",
        autoLayout: "Auto Layout",
        selecting: "Selecting",
        folderSelect: "Folder Select",
        unpackFolder: "Unpack Folder",
        reset: "Reset",
        hotkeys: "Hotkeys: Ctrl/Cmd+C V D K Z / Delete / Arrows"
      },
      sidebar: {
        leftTabs: "Left sidebar tabs",
        nodeLibrary: "Node Library",
        nodeTemplates: "Node Templates"
      },
      library: {
        searchPlaceholder: "Search node library...",
        groups: {
          builtin: "Built-in Nodes",
          imported: "User Imported",
          downloaded: "Downloaded from Forge"
        },
        add: "Add",
        noMatches: "No matches",
        nodes: "Nodes",
        downloads: "Downloads",
        noImportedPacks: "No imported node packs",
        signInHintForImported: "Sign in to view your imported node packs",
        loading: "Loading...",
        noDownloadedPacks: "No downloaded node packs"
      },
      templates: {
        copy: "Pick preset templates and apply to canvas",
        apply: "Apply",
        hint: "Drag blank canvas to encapsulate nodes into folder"
      },
      properties: {
        node: "Node Properties",
        folder: "Folder Properties",
        nodeName: "Node Name",
        nodeType: "Node Type",
        positionX: "X",
        positionY: "Y",
        folderName: "Folder Name",
        tone: "Tone",
        tones: {
          cyan: "Cyan",
          amber: "Amber",
          green: "Green",
          pink: "Pink"
        },
        nodeCount: "Nodes",
        empty: "No node or folder selected"
      },
      preview: {
        title: "SKILL.md Live Preview",
        copy: "Any node change updates the structured document in real time",
        path: "skill@composer:~/SKILL.md",
        modeGroup: "Render mode",
        modeRaw: "Raw",
        modeRendered: "Rendered",
        colorMapOn: "Color Map: ON",
        colorMapOff: "Color Map: OFF",
        editorTraditional: "Traditional",
        editorVim: "Vim",
        editorTraditionalStatus: "Editor: Traditional",
        editorVimInsert: "Editor: Vim INSERT",
        editorVimNormal: "Editor: Vim NORMAL",
        liveOn: "Live Mapping: ON",
        liveOff: "Live Mapping: OFF",
        syncOnce: "Sync Once",
        copied: "Copied",
        copy: "Copy",
        rawAria: "Markdown raw text",
        aria: "Markdown preview",
        lines: "lines",
        chars: "chars",
        auto: "AUTO",
        manual: "MANUAL"
      }
    }
  }
};

export function resolveLocale(locale) {
  const supported = new Set(SUPPORTED_LOCALES.map((item) => item.id));
  if (supported.has(locale)) {
    return locale;
  }

  if (typeof locale === "string" && locale.toLowerCase().startsWith("zh")) {
    return "zh-CN";
  }

  return "en-US";
}

export function getByPath(objectValue, path) {
  return path.split(".").reduce((acc, key) => {
    if (acc === undefined || acc === null) {
      return undefined;
    }
    return acc[key];
  }, objectValue);
}
