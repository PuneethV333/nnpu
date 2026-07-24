## IMPORTANT

You are responsible ONLY for designing and implementing the UI.

The project already provides:

- Custom hooks
- API hooks
- React Query hooks
- Navigation
- Authentication
- Business logic
- State management
- Validation
- API services

Do NOT:

- Create API calls
- Write axios/fetch code
- Create React Query hooks
- Create business logic
- Create mock APIs
- Modify backend code
- Change navigation architecture
- Add unnecessary dependencies

Instead, assume the required hooks already exist.

Use them like:

```tsx
const {
  data,
  isLoading,
  error,
  refetch,
  onSubmit,
  create,
  update,
  remove,
} = useFeature();
```

If a hook is missing, use a placeholder with the expected interface and clearly mark it as:

// Provided by project

Focus on:

- Beautiful UI
- Clean component structure
- Responsive layouts
- NativeWind styling
- Accessibility
- Loading states
- Error states
- Empty states
- Animations when appropriate
- Reusable components

Never spend time implementing backend logic.

Your goal is to produce production-ready React Native UI that integrates with existing hooks.