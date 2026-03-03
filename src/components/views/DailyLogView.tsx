import { useEffect, useState } from 'react'
import { format, subDays } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'

type DailyLog = Database['public']['Tables']['daily_logs']['Row']
type DailyLogInsert = Database['public']['Tables']['daily_logs']['Insert']

export function DailyLogView() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [currentLog, setCurrentLog] = useState<DailyLog | null>(null)
  const [recentLogs, setRecentLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // Form state
  const [energy, setEnergy] = useState(3)
  const [focus, setFocus] = useState(3)
  const [stress, setStress] = useState(3)
  const [sleepHours, setSleepHours] = useState(7)
  const [notes, setNotes] = useState('')

  // Fetch log for selected date
  useEffect(() => {
    fetchLogForDate(selectedDate)
    fetchRecentLogs()
  }, [selectedDate])

  const fetchLogForDate = async (date: string) => {
    try {
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('date', date)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error
      }

      setCurrentLog(data as any)
      
      // Update form with existing data or reset to defaults
      if (data) {
        const log = data as any
        setEnergy(log.energy ?? 3)
        setFocus(log.focus ?? 3)
        setStress(log.stress ?? 3)
        setSleepHours(log.sleep_hours ?? 7)
        setNotes(log.notes ?? '')
      } else {
        // Reset to defaults for new log
        setEnergy(3)
        setFocus(3)
        setStress(3)
        setSleepHours(7)
        setNotes('')
      }
    } catch (error) {
      console.error('Error fetching daily log:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch daily log',
        variant: 'destructive',
      })
    }
  }

  const fetchRecentLogs = async () => {
    try {
      setLoading(true)
      const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd')
      
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .gte('date', sevenDaysAgo)
        .order('date', { ascending: false })
        .limit(7)

      if (error) throw error

      setRecentLogs(data || [])
    } catch (error) {
      console.error('Error fetching recent logs:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch recent logs',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const logData: DailyLogInsert = {
        date: selectedDate,
        energy,
        focus,
        stress,
        sleep_hours: sleepHours,
        notes: notes.trim() || null,
      }

      if (currentLog) {
        // Update existing log
        const { error } = await supabase
          .from('daily_logs')
          .update({
            ...logData,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', currentLog.id)

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Daily log updated successfully',
        })
      } else {
        // Create new log
        const { error } = await supabase
          .from('daily_logs')
          .insert(logData as any)

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Daily log created successfully',
        })
      }

      // Refresh data
      await fetchLogForDate(selectedDate)
      await fetchRecentLogs()
    } catch (error) {
      console.error('Error saving daily log:', error)
      toast({
        title: 'Error',
        description: 'Failed to save daily log',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const formatLogDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T00:00:00')
      return format(date, 'MMM d, yyyy')
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Daily Log</h1>
        <p className="text-muted-foreground">Track your daily wellbeing metrics</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log Entry</CardTitle>
          <CardDescription>
            {currentLog ? 'Update your daily log' : 'Create a new daily log'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          {/* Energy Slider */}
          <div className="space-y-2">
            <Label htmlFor="energy">Energy Level: {energy}</Label>
            <div className="flex items-center gap-4">
              <Input
                id="energy"
                type="range"
                min="1"
                max="5"
                step="1"
                value={energy}
                onChange={(e) => setEnergy(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-12 text-right">
                {energy}/5
              </span>
            </div>
          </div>

          {/* Focus Slider */}
          <div className="space-y-2">
            <Label htmlFor="focus">Focus Level: {focus}</Label>
            <div className="flex items-center gap-4">
              <Input
                id="focus"
                type="range"
                min="1"
                max="5"
                step="1"
                value={focus}
                onChange={(e) => setFocus(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-12 text-right">
                {focus}/5
              </span>
            </div>
          </div>

          {/* Stress Slider */}
          <div className="space-y-2">
            <Label htmlFor="stress">Stress Level: {stress}</Label>
            <div className="flex items-center gap-4">
              <Input
                id="stress"
                type="range"
                min="1"
                max="5"
                step="1"
                value={stress}
                onChange={(e) => setStress(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-12 text-right">
                {stress}/5
              </span>
            </div>
          </div>

          {/* Sleep Hours */}
          <div className="space-y-2">
            <Label htmlFor="sleep">Sleep Hours</Label>
            <Input
              id="sleep"
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(Number(e.target.value))}
              className="max-w-[200px]"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes about your day..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving...' : currentLog ? 'Update Log' : 'Create Log'}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Logs (Last 7 Days)</CardTitle>
          <CardDescription>Your daily wellbeing history</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading recent logs...</p>
          ) : recentLogs.length === 0 ? (
            <p className="text-muted-foreground">No recent logs found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Energy</TableHead>
                  <TableHead className="text-center">Focus</TableHead>
                  <TableHead className="text-center">Stress</TableHead>
                  <TableHead className="text-center">Sleep (hrs)</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLogs.map((log) => (
                  <TableRow 
                    key={log.id}
                    className={log.date === selectedDate ? 'bg-muted/50' : ''}
                  >
                    <TableCell className="font-medium">
                      {formatLogDate(log.date)}
                    </TableCell>
                    <TableCell className="text-center">{log.energy ?? '-'}</TableCell>
                    <TableCell className="text-center">{log.focus ?? '-'}</TableCell>
                    <TableCell className="text-center">{log.stress ?? '-'}</TableCell>
                    <TableCell className="text-center">{log.sleep_hours ?? '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.notes ? (
                        log.notes.length > 50 
                          ? log.notes.substring(0, 50) + '...' 
                          : log.notes
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
