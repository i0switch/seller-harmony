# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - region "Notifications (F8)":
      - list
    - region "Notifications alt+T"
    - generic [ref=e4]:
      - generic [ref=e5]:
        - heading "🎤 販売者ログイン" [level=1] [ref=e6]
        - paragraph [ref=e7]: ダッシュボードにアクセス
      - generic [ref=e8]:
        - generic [ref=e9]:
          - text: メールアドレス
          - textbox "メールアドレス" [ref=e10]
        - generic [ref=e11]:
          - text: パスワード
          - textbox "パスワード" [ref=e12]
        - button "ログイン" [ref=e13] [cursor=pointer]
      - paragraph [ref=e14]:
        - text: 初めてですか？
        - link "新規登録" [ref=e15] [cursor=pointer]:
          - /url: /seller/signup
  - complementary "Edit with Lovable" [ref=e16]:
    - link "Edit with Lovable" [ref=e17] [cursor=pointer]:
      - /url: https://lovable.dev/projects/228f4fc4-0fbb-435a-9b19-6a6ad65e1f39?utm_source=lovable-badge
      - generic [ref=e18]: Edit with
      - img [ref=e19]
    - button "Dismiss" [ref=e24] [cursor=pointer]:
      - img [ref=e25]
```