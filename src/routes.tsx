import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './components/auth/LoginPage'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { MainLayout } from './components/layout/MainLayout'
import { TodayView } from './components/views/TodayView'
import { InboxView } from './components/views/InboxView'
import { DueSoonView } from './components/views/DueSoonView'
import { BlockedView } from './components/views/BlockedView'
import { CompletedView } from './components/views/CompletedView'
import { CoursesView } from './components/views/CoursesView'
import { DailyLogView } from './components/views/DailyLogView'
import { DataExportView } from './components/views/DataExportView'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/today" replace />} />
        <Route path="today" element={<TodayView />} />
        <Route path="inbox" element={<InboxView />} />
        <Route path="due-soon" element={<DueSoonView />} />
        <Route path="blocked" element={<BlockedView />} />
        <Route path="completed" element={<CompletedView />} />
        <Route path="courses" element={<CoursesView />} />
        <Route path="daily-log" element={<DailyLogView />} />
        <Route path="export" element={<DataExportView />} />
      </Route>
    </Routes>
  )
}
