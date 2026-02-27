# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - region "Notifications (F8)":
      - list
    - region "Notifications alt+T"
    - generic [ref=e4]:
      - generic [ref=e5]:
        - heading "🎤 販売者登録" [level=1] [ref=e6]
        - paragraph [ref=e7]: ファンクラブを始めましょう
      - generic [ref=e8]:
        - generic [ref=e9]:
          - text: 表示名
          - textbox "クリエイター名" [ref=e10]: テスト販売者
        - generic [ref=e11]:
          - text: メールアドレス
          - textbox "you@example.com" [active] [ref=e12]: invalid-email
        - generic [ref=e13]:
          - text: パスワード
          - textbox "8文字以上" [ref=e14]: "1234"
        - generic [ref=e15]:
          - checkbox "利用規約およびプライバシーポリシーに同意します" [ref=e16] [cursor=pointer]
          - checkbox
          - generic [ref=e17]: 利用規約およびプライバシーポリシーに同意します
        - button "アカウント作成" [ref=e18] [cursor=pointer]
      - paragraph [ref=e19]:
        - text: 既にアカウントをお持ちですか？
        - link "ログイン" [ref=e20] [cursor=pointer]:
          - /url: /seller/login
  - complementary "Edit with Lovable" [ref=e21]:
    - link "Edit with Lovable" [ref=e22] [cursor=pointer]:
      - /url: https://lovable.dev/projects/228f4fc4-0fbb-435a-9b19-6a6ad65e1f39?utm_source=lovable-badge
      - generic [ref=e23]: Edit with
      - img [ref=e24]
    - button "Dismiss" [ref=e29] [cursor=pointer]:
      - img [ref=e30]
```