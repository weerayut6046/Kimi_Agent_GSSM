"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { th } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// String date version for easy integration with existing forms
interface DatePickerStringProps {
  value: string
  onChange: (dateString: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

function DatePickerString({
  value,
  onChange,
  placeholder = "เลือกวันที่",
  className,
  disabled = false,
}: DatePickerStringProps) {
  const [open, setOpen] = React.useState(false)
  
  const date = value ? parseISO(value) : undefined
  
  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Convert to ISO string (YYYY-MM-DD)
      const isoString = format(selectedDate, 'yyyy-MM-dd')
      onChange(isoString)
      setOpen(false)
    } else {
      onChange('')
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            format(parseISO(value), "dd/MM/yyyy", { locale: th })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-0" align="start">
        <Calendar
          selected={date}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  )
}

// String date range version
interface DatePickerRangeStringProps {
  from: string
  to: string
  setFrom: (dateString: string) => void
  setTo: (dateString: string) => void
  className?: string
  disabled?: boolean
}

function DatePickerRangeString({
  from,
  to,
  setFrom,
  setTo,
  className,
  disabled = false,
}: DatePickerRangeStringProps) {
  const [openFrom, setOpenFrom] = React.useState(false)
  const [openTo, setOpenTo] = React.useState(false)
  
  const fromDate = from ? parseISO(from) : undefined
  const toDate = to ? parseISO(to) : undefined
  
  const handleFromSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setFrom(format(selectedDate, 'yyyy-MM-dd'))
      setOpenFrom(false)
    } else {
      setFrom('')
    }
  }
  
  const handleToSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setTo(format(selectedDate, 'yyyy-MM-dd'))
      setOpenTo(false)
    } else {
      setTo('')
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={openFrom} onOpenChange={setOpenFrom}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !from && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {from ? format(parseISO(from), "dd/MM/yyyy", { locale: th }) : "วันที่เริ่มต้น"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 border-0" align="start">
          <Calendar
            selected={fromDate}
            onSelect={handleFromSelect}
          />
        </PopoverContent>
      </Popover>
      <span className="text-muted-foreground">-</span>
      <Popover open={openTo} onOpenChange={setOpenTo}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !to && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {to ? format(parseISO(to), "dd/MM/yyyy", { locale: th }) : "วันที่สิ้นสุด"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 border-0" align="start">
          <Calendar
            selected={toDate}
            onSelect={handleToSelect}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { DatePickerString, DatePickerRangeString }
