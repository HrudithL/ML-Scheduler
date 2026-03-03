import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { parseICS } from "@/lib/icsParser";
import type { ParsedCourse } from "@/lib/icsParser";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface DaySchedule {
  start_time: string;
  end_time: string;
}

interface Course {
  id: string;
  name: string;
  days: string[] | null;
  start_time_str: string | null;
  end_time_str: string | null;
  day_schedules: Record<string, DaySchedule> | null;
  semester: string | null;
  credits: number | null;
  is_virtual: boolean;
}

interface CourseFormData {
  name: string;
  days: string[];
  start_time_str: string;
  end_time_str: string;
  usePerDayTimes: boolean;
  daySchedules: Record<string, DaySchedule>;
  semester: string;
  credits: number | null;
  is_virtual: boolean;
}

const DAYS_OF_WEEK = [
  { value: "mon", label: "Monday", short: "Mon" },
  { value: "tue", label: "Tuesday", short: "Tue" },
  { value: "wed", label: "Wednesday", short: "Wed" },
  { value: "thu", label: "Thursday", short: "Thu" },
  { value: "fri", label: "Friday", short: "Fri" },
  { value: "sat", label: "Saturday", short: "Sat" },
  { value: "sun", label: "Sunday", short: "Sun" },
];

export function CoursesView() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState<CourseFormData>({
    name: "",
    days: [],
    start_time_str: "",
    end_time_str: "",
    usePerDayTimes: false,
    daySchedules: {},
    semester: "",
    credits: null,
    is_virtual: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [icsPreviewOpen, setIcsPreviewOpen] = useState(false);
  const [icsParsedCourses, setIcsParsedCourses] = useState<ParsedCourse[]>([]);
  const [icsSelected, setIcsSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("courses")
        .select("*")
        .order("name", { ascending: true });

      if (fetchError) throw fetchError;

      setCourses((data || []) as Course[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch courses");
      console.error("Error fetching courses:", err);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Course name is required";
    }

    if (
      formData.credits !== null &&
      (formData.credits < 0 || formData.credits > 20)
    ) {
      errors.credits = "Credits must be between 0 and 20";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenDialog = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      const hasPerDayTimes =
        course.day_schedules != null &&
        Object.keys(course.day_schedules).length > 0;
      setFormData({
        name: course.name,
        days: course.days || [],
        start_time_str: course.start_time_str || "",
        end_time_str: course.end_time_str || "",
        usePerDayTimes: hasPerDayTimes,
        daySchedules:
          (course.day_schedules as Record<string, DaySchedule>) || {},
        semester: course.semester || "",
        credits: course.credits,
        is_virtual: course.is_virtual ?? false,
      });
    } else {
      setEditingCourse(null);
      setFormData({
        name: "",
        days: [],
        start_time_str: "",
        end_time_str: "",
        usePerDayTimes: false,
        daySchedules: {},
        semester: "",
        credits: null,
        is_virtual: false,
      });
    }
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCourse(null);
    setFormErrors({});
  };

  const handleDayToggle = (day: string) => {
    setFormData((prev) => {
      const isRemoving = prev.days.includes(day);
      const newDays = isRemoving
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day];

      // When adding a day, initialize its schedule with defaults
      const newSchedules = { ...prev.daySchedules };
      if (!isRemoving) {
        newSchedules[day] = {
          start_time: prev.start_time_str || "",
          end_time: prev.end_time_str || "",
        };
      } else {
        delete newSchedules[day];
      }

      return { ...prev, days: newDays, daySchedules: newSchedules };
    });
  };

  const handleDayScheduleChange = (
    day: string,
    field: "start_time" | "end_time",
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      daySchedules: {
        ...prev.daySchedules,
        [day]: { ...prev.daySchedules[day], [field]: value },
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const courseData = {
        name: formData.name.trim(),
        days: formData.days.length > 0 ? formData.days : null,
        start_time_str: formData.start_time_str || null,
        end_time_str: formData.end_time_str || null,
        day_schedules:
          formData.usePerDayTimes &&
          Object.keys(formData.daySchedules).length > 0
            ? formData.daySchedules
            : null,
        semester: formData.semester || null,
        credits: formData.credits,
        is_virtual: formData.is_virtual,
      };

      if (editingCourse) {
        // Update existing course
        const { error: updateError } = await supabase
          .from("courses")
          .update(courseData as any)
          .eq("id", editingCourse.id);

        if (updateError) throw updateError;

        toast({
          title: "Success",
          description: "Course updated successfully",
        });
      } else {
        // Create new course
        const { error: insertError } = await supabase
          .from("courses")
          .insert([courseData as any]);

        if (insertError) throw insertError;

        toast({
          title: "Success",
          description: "Course created successfully",
        });
      }

      handleCloseDialog();
      fetchCourses();
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to save course",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (course: Course) => {
    if (!confirm(`Are you sure you want to delete "${course.name}"?`)) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from("courses")
        .delete()
        .eq("id", course.id);

      if (deleteError) throw deleteError;

      toast({
        title: "Success",
        description: "Course deleted successfully",
      });

      fetchCourses();
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to delete course",
        variant: "destructive",
      });
    }
  };

  // ---- ICS Import ----

  const handleIcsFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseICS(text);
        if (parsed.length === 0) {
          toast({
            title: "No courses found",
            description:
              "The ICS file did not contain any events that could be imported as courses.",
            variant: "destructive",
          });
          return;
        }
        setIcsParsedCourses(parsed);
        setIcsSelected(new Set(parsed.map((_, i) => i))); // select all by default
        setIcsPreviewOpen(true);
      } catch (err) {
        toast({
          title: "Parse error",
          description:
            err instanceof Error ? err.message : "Failed to parse ICS file",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);

    // Reset so the same file can be selected again
    e.target.value = "";
  };

  const toggleIcsSelection = (index: number) => {
    setIcsSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleImportSelected = async () => {
    const selected = icsParsedCourses.filter((_, i) => icsSelected.has(i));
    if (selected.length === 0) return;

    setImporting(true);
    try {
      const rows = selected.map((c) => ({
        name: c.name,
        days: c.days.length > 0 ? c.days : null,
        start_time_str: c.start_time_str || null,
        end_time_str: c.end_time_str || null,
        is_virtual: c.is_virtual,
      }));

      const { error: insertError } = await supabase
        .from("courses")
        .insert(rows as any);

      if (insertError) throw insertError;

      toast({
        title: "Import successful",
        description: `${selected.length} course${selected.length > 1 ? "s" : ""} imported`,
      });

      setIcsPreviewOpen(false);
      setIcsParsedCourses([]);
      setIcsSelected(new Set());
      fetchCourses();
    } catch (err) {
      toast({
        title: "Import failed",
        description:
          err instanceof Error ? err.message : "Failed to import courses",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading courses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Courses</h1>
          <p className="text-muted-foreground mt-1">
            Manage your course schedule
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".ics,.ical"
            className="hidden"
            onChange={handleIcsFileSelect}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            title="Import courses from an .ics calendar file"
          >
            📅 Import ICS
          </Button>
          <Button onClick={() => handleOpenDialog()}>New Course</Button>
        </div>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 space-y-4">
            <p className="text-muted-foreground">No courses yet</p>
            <Button onClick={() => handleOpenDialog()}>
              Add Your First Course
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => {
                  const hasPerDay =
                    course.day_schedules &&
                    Object.keys(course.day_schedules).length > 0;
                  return (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {course.name}
                          {course.is_virtual && (
                            <Badge variant="outline" className="text-xs">
                              Virtual
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {hasPerDay ? (
                          <div className="space-y-1 text-sm">
                            {DAYS_OF_WEEK.filter(
                              (d) =>
                                course.day_schedules &&
                                d.value in course.day_schedules,
                            ).map((d) => {
                              const sched = (
                                course.day_schedules as Record<
                                  string,
                                  DaySchedule
                                >
                              )[d.value];
                              return (
                                <div key={d.value}>
                                  <span className="font-medium">
                                    {d.short}:
                                  </span>{" "}
                                  {sched.start_time || "?"} –{" "}
                                  {sched.end_time || "?"}
                                </div>
                              );
                            })}
                          </div>
                        ) : course.days && course.days.length > 0 ? (
                          <div className="text-sm">
                            <div>
                              {course.days
                                .map((d) => d.toUpperCase())
                                .join(", ")}
                            </div>
                            {(course.start_time_str || course.end_time_str) && (
                              <div className="text-muted-foreground">
                                {course.start_time_str || "?"} –{" "}
                                {course.end_time_str || "?"}
                              </div>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{course.semester || "-"}</TableCell>
                      <TableCell>
                        {course.credits !== null ? course.credits : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(course)}
                            title="Edit this course's details and schedule"
                          >
                            ✏️ Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(course)}
                            title="Permanently delete this course"
                          >
                            🗑 Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Course Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCourse ? "Edit Course" : "New Course"}
            </DialogTitle>
            <DialogDescription>
              {editingCourse
                ? "Update the course details below"
                : "Add a new course to your schedule"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Course Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., BUSN 460"
              />
              {formErrors.name && (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="grid grid-cols-2 gap-3">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={day.value}
                      checked={formData.days.includes(day.value)}
                      onCheckedChange={() => handleDayToggle(day.value)}
                    />
                    <label
                      htmlFor={day.value}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {day.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Default Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time_str}
                  onChange={(e) =>
                    setFormData({ ...formData, start_time_str: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time">Default End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time_str}
                  onChange={(e) =>
                    setFormData({ ...formData, end_time_str: e.target.value })
                  }
                />
              </div>
            </div>

            {formData.days.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="usePerDayTimes"
                    checked={formData.usePerDayTimes}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        usePerDayTimes: !!checked,
                      }))
                    }
                  />
                  <label
                    htmlFor="usePerDayTimes"
                    className="text-sm font-medium leading-none"
                  >
                    Customize times per day
                  </label>
                </div>

                {formData.usePerDayTimes && (
                  <div className="space-y-3 pl-6 border-l-2 border-muted">
                    {DAYS_OF_WEEK.filter((d) =>
                      formData.days.includes(d.value),
                    ).map((day) => (
                      <div
                        key={day.value}
                        className="grid grid-cols-[80px_1fr_1fr] gap-2 items-center"
                      >
                        <span className="text-sm font-medium">{day.short}</span>
                        <Input
                          type="time"
                          value={
                            formData.daySchedules[day.value]?.start_time || ""
                          }
                          onChange={(e) =>
                            handleDayScheduleChange(
                              day.value,
                              "start_time",
                              e.target.value,
                            )
                          }
                          placeholder="Start"
                        />
                        <Input
                          type="time"
                          value={
                            formData.daySchedules[day.value]?.end_time || ""
                          }
                          onChange={(e) =>
                            handleDayScheduleChange(
                              day.value,
                              "end_time",
                              e.target.value,
                            )
                          }
                          placeholder="End"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="semester">Semester</Label>
              <Input
                id="semester"
                value={formData.semester}
                onChange={(e) =>
                  setFormData({ ...formData, semester: e.target.value })
                }
                placeholder="e.g., Spring 2026"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="credits">Credits</Label>
              <Input
                id="credits"
                type="number"
                min="0"
                max="20"
                step="1"
                value={formData.credits ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    credits: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                placeholder="e.g., 3"
              />
              {formErrors.credits && (
                <p className="text-sm text-destructive">{formErrors.credits}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_virtual"
                checked={formData.is_virtual}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_virtual: !!checked }))
                }
              />
              <label
                htmlFor="is_virtual"
                className="text-sm font-medium leading-none"
              >
                Virtual course (no physical meeting times)
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingCourse ? "Update Course" : "Create Course"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ICS Import Preview Dialog */}
      <Dialog open={icsPreviewOpen} onOpenChange={setIcsPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Courses from ICS</DialogTitle>
            <DialogDescription>
              Select the courses you want to import. Courses with 12 AM–12 AM
              times are marked as virtual.
            </DialogDescription>
          </DialogHeader>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {icsParsedCourses.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Checkbox
                        checked={icsSelected.has(i)}
                        onCheckedChange={() => toggleIcsSelection(i)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      {c.days.length > 0
                        ? c.days.map((d) => d.toUpperCase()).join(", ")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {c.is_virtual ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        `${c.start_time_str || "?"} – ${c.end_time_str || "?"}`
                      )}
                    </TableCell>
                    <TableCell>
                      {c.is_virtual ? (
                        <Badge variant="outline">Virtual</Badge>
                      ) : (
                        <Badge>In Person</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIcsPreviewOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImportSelected}
              disabled={icsSelected.size === 0 || importing}
            >
              {importing
                ? "Importing..."
                : `Import ${icsSelected.size} Course${icsSelected.size !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
