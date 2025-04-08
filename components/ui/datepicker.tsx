'use client'

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// Define the props the component accepts
interface DatePickerProps {
    selected?: Date;
    onChange: (date: Date | undefined) => void;
    placeholderText?: string;
    dateFormat?: string;
    showTimeSelect?: boolean; // Keep for compatibility, though functionality isn't added here
    required?: boolean;
    id?: string;
    className?: string; // Allow className to be passed
}

// Export the component with the correct name and props
export function DatePicker({
    className,
    selected,
    onChange,
    placeholderText = "Pick a date",
    dateFormat = "PPP", // Default date-fns format
    showTimeSelect, // Prop received but not used in this basic version
    required,
    id
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id} // Use the id prop
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal", // Use w-full to match usage
            !selected && "text-muted-foreground",
            className // Apply passed className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {/* Use the selected prop and format it */}
          {selected ? format(selected, dateFormat) : <span>{placeholderText}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected} // Use the selected prop
          onSelect={onChange} // Use the onChange prop
          initialFocus
        />
        {/* Reminder: Time selection is not implemented here */}
      </PopoverContent>
    </Popover>
  )
}