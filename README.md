# RAG Tutor

Your AI Tutor That Teaches, Not Solves. Context-aware, course-restricted, and strictly backed by citations from your uploaded materials.

## Project Structure

This application separates student and faculty features with dedicated portals:

### Student Portal (`/student/*`)
- **Auth**: Student login/signup
- **Dashboard**: Learning progress, daily streaks, suggested questions
- **Chat**: AI tutor with Socratic questioning
- **Learn**: Learning resources and materials
- **Analytics**: Personal progress tracking
- **Settings**: Account management

### Faculty Portal (`/faculty/*`)
- **Auth**: Faculty login/signup
- **Dashboard**: Student analytics, document uploads, course overview
- **Courses**: Course management interface
- **Students**: Student tracking and engagement
- **Analytics**: Detailed analytics dashboard
- **Settings**: Account management

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

Visit `http://localhost:3000` to see the landing page.

## Routes

### Public
- `/` - Landing page
- `/student/auth` - Student authentication
- `/faculty/auth` - Faculty authentication

### Student (Protected)
- `/student/dashboard` - Main dashboard
- `/student/chat` - AI tutor chat
- `/student/learn` - Learning resources
- `/student/analytics` - Progress analytics
- `/student/settings` - Settings

### Faculty (Protected)
- `/faculty/dashboard` - Main dashboard
- `/faculty/courses` - Course management
- `/faculty/students` - Student overview
- `/faculty/analytics` - Analytics
- `/faculty/settings` - Settings

## Features

### For Students
- 🤖 AI tutor with Socratic questioning
- 📊 Learning progress tracking
- 🔥 Daily streak tracking
- 💡 Personalized question suggestions
- 📚 Course-restricted knowledge base
- 📖 Citation-backed responses

### For Faculty
- 📤 Document upload and indexing
- 👥 Student progress monitoring
- 📈 Analytics dashboard
- ⚠️ Pain point identification
- 📋 Multi-course management
- 🔍 Query pattern analysis

## Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Styling**: Tailwind CSS
- **UI**: shadcn/ui components
- **State**: Zustand
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Documentation

See [STRUCTURE.md](./STRUCTURE.md) for detailed project structure and architecture.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## License

MIT
