# Material Dashboard 3 - Next.js Version

This is a **Next.js conversion** of the Material Dashboard 3 template by Creative Tim. The original static HTML dashboard has been transformed into a modern React/Next.js application.

## 🚀 **Migration Complete!**

### **What was migrated:**
- ✅ **All HTML pages** → Next.js pages with App Router
- ✅ **CSS & SCSS** → Preserved and integrated with Next.js
- ✅ **JavaScript interactions** → React components and hooks
- ✅ **Static assets** → Optimized for Next.js
- ✅ **Navigation** → Dynamic routing with Next.js Link
- ✅ **Layout system** → Reusable React components

### **Pages Available:**
- `/dashboard` - Main dashboard with stats cards and charts
- `/tables` - Data tables page
- `/profile` - User profile page
- `/sign-in` - Authentication page
- `/billing`, `/notifications`, `/virtual-reality`, `/rtl` - Additional pages

### **Components Created:**
- **Layout** - Main layout wrapper with sidebar and navbar
- **Sidebar** - Navigation sidebar with dynamic active states
- **Navbar** - Top navigation bar
- **StatCard** - Dashboard statistics cards

## 🛠 **Development**

### **Prerequisites:**
- Node.js 18+ 
- npm or yarn

### **Installation:**
```bash
npm install
```

### **Development Server:**
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### **Build for Production:**
```bash
npm run build
npm start
```

## 📁 **Project Structure**

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/          # Dashboard page
│   ├── tables/            # Tables page
│   ├── profile/           # Profile page
│   ├── sign-in/           # Sign in page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── Layout.tsx         # Main layout component
│   ├── Sidebar.tsx        # Navigation sidebar
│   ├── Navbar.tsx         # Top navbar
│   └── StatCard.tsx       # Statistics card component
public/
├── assets/                # Static assets from original
│   ├── css/              # CSS files
│   ├── js/               # JavaScript files
│   ├── img/              # Images
│   └── fonts/            # Fonts
```

## 🎨 **Styling**

- **CSS Framework:** Bootstrap 5 + Material Design
- **Icons:** Material Symbols + Font Awesome
- **Fonts:** Inter font family
- **Theme:** Material Dashboard 3 theme preserved

## 🔧 **Technologies Used**

- **Next.js 15.5** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **SASS** - CSS preprocessing
- **Bootstrap 5** - CSS framework
- **Material Design** - Design system

## 🌟 **Features**

- **Server-side rendering** (SSR)
- **Static site generation** (SSG)
- **Optimized images** with Next.js Image component
- **Type safety** with TypeScript
- **Modern React patterns** (hooks, functional components)
- **Responsive design** preserved from original
- **Fast navigation** with Next.js routing
- **SEO optimized** with proper meta tags

## 🚀 **Deployment**

This Next.js app can be deployed to:
- **Vercel** (recommended) - [Deploy with Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)
- **Netlify**
- **AWS** 
- **Google Cloud**
- Any hosting service that supports Next.js

## 📝 **Notes**

- All original Material Dashboard styling and functionality preserved
- Components are fully typed with TypeScript
- Uses Next.js 15 App Router for modern routing
- Responsive design works across all devices
- Charts and interactive elements ready for data integration

## 🤝 **Contributing**

This is a conversion of Creative Tim's Material Dashboard. Please refer to the original license terms.

## 📄 **License**

Based on Material Dashboard 3 by Creative Tim (MIT License)
