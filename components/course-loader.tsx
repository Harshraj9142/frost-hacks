"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useCourseStore } from "@/lib/store";

export function CourseLoader() {
  const { data: session } = useSession();
  const { courses, setCourses, setLoading } = useCourseStore();

  useEffect(() => {
    const fetchCourses = async () => {
      if (!session?.user) return;
      
      // Skip if courses already loaded
      if (courses.length > 0) return;

      setLoading(true);
      try {
        // Use different endpoint based on role
        const endpoint = session.user.role === "faculty" 
          ? "/api/faculty/courses" 
          : "/api/courses";
        
        const response = await fetch(endpoint);
        if (response.ok) {
          const data = await response.json();
          setCourses(data.courses || []);
        }
      } catch (error) {
        console.error("Failed to fetch courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [session, courses.length, setCourses, setLoading]);

  return null; // This component doesn't render anything
}
