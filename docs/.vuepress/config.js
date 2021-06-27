module.exports = {
  title: "林晴的博客",
  description: "林晴的个人博客",
  head: [
    ["meta", {name: "author", content: "林晴"}]
  ],
  theme: 'yuu',
  themeConfig: {
    // nav: [
    //   {
    //     text: 'es6',
    //     link: '/es6'
    //   },
    //   {
    //     text: 'vue3',
    //     items: [
    //       { text: 'setup', link: '/vue3/setup' },
    //       { text: 'slot', link: '/vue3/slot' }
    //     ]
    //   }
    // ],
    sidebar: [
      {
        title: 'vue3',
        // path: '/vue3',
        // collapsable: false,
        children: [
          ['/vue3/lifehooks', '生命周期'],
          ['/vue3/setup', 'setup']
        ]
      },
      {
        title: 'es6',
        // path: '/vue3',
        // collapsable: false,
        children: [
          ['/es6/异步编程', '异步编程'],
          ['/es6/你不知道的js', '你不知道的js']
        ]
      },
      {
        title: 'knowledge',
        children: [
          ['/interview/cookie_session_token', 'cookie,session,token']
        ]
      }
    ]
  }
}