import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  Linkedin,
  Twitter,
  Save,
  Loader2,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { IcpProfile } from "@shared/schema";

// US States list
const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
];

// Institution types matching the schema
const INSTITUTION_TYPES = [
  { value: "county", label: "County Government" },
  { value: "city", label: "City Government" },
  { value: "district", label: "District" },
  { value: "hospital", label: "Hospital" },
  { value: "health_system", label: "Health System" },
  { value: "clinic", label: "Clinic" },
  { value: "law_firm", label: "Law Firm" },
  { value: "legal_department", label: "Legal Department" },
  { value: "bank", label: "Bank" },
  { value: "credit_union", label: "Credit Union" },
  { value: "insurance", label: "Insurance" },
  { value: "pe_firm", label: "Private Equity Firm" },
  { value: "portfolio_company", label: "Portfolio Company" },
  { value: "other", label: "Other" },
];

// Form validation schema
const addLeadFormSchema = z.object({
  institutionName: z.string().min(1, "Institution name is required"),
  institutionType: z.string().min(1, "Institution type is required"),
  state: z.string().min(1, "State is required"),
  county: z.string().optional(),
  city: z.string().optional(),
  department: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phoneNumber: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  linkedinUrl: z.string().url("Invalid LinkedIn URL").optional().or(z.literal("")),
  twitterHandle: z.string().optional(),
  population: z.coerce.number().int().positive().optional().or(z.literal("")),
  annualBudget: z.string().optional(),
  notes: z.string().optional(),
  icpId: z.coerce.number().int().positive().optional().or(z.literal("")),
  enrichOnSave: z.boolean().default(false),
});

type AddLeadFormValues = z.infer<typeof addLeadFormSchema>;

interface Institution {
  name: string;
  type: string;
  state: string;
}

export default function AddLeadPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [institutionOpen, setInstitutionOpen] = useState(false);

  // Fetch ICP profiles for assignment
  const { data: icpProfiles = [] } = useQuery<IcpProfile[]>({
    queryKey: ["/api/icp"],
  });

  // Fetch existing institutions for autocomplete
  const { data: institutions = [] } = useQuery<Institution[]>({
    queryKey: ["/api/leads/institutions"],
  });

  const form = useForm<AddLeadFormValues>({
    resolver: zodResolver(addLeadFormSchema),
    defaultValues: {
      institutionName: "",
      institutionType: "",
      state: "",
      county: "",
      city: "",
      department: "",
      email: "",
      phoneNumber: "",
      website: "",
      linkedinUrl: "",
      twitterHandle: "",
      population: "",
      annualBudget: "",
      notes: "",
      icpId: "",
      enrichOnSave: false,
    },
  });

  const createLeadMutation = useMutation({
    mutationFn: async (data: AddLeadFormValues) => {
      // Clean up empty strings and convert to proper types
      const payload = {
        ...data,
        population: data.population === "" ? null : Number(data.population),
        icpId: data.icpId === "" ? null : Number(data.icpId),
        email: data.email || null,
        website: data.website || null,
        linkedinUrl: data.linkedinUrl || null,
      };

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create lead");
      }

      return res.json();
    },
    onSuccess: (lead) => {
      toast({
        title: "Lead created",
        description: `${lead.institutionName} has been added successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setLocation(`/leads/${lead.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddLeadFormValues) => {
    createLeadMutation.mutate(data);
  };

  // Handle institution autocomplete selection
  const handleInstitutionSelect = (institution: Institution) => {
    form.setValue("institutionName", institution.name);
    form.setValue("institutionType", institution.type);
    form.setValue("state", institution.state);
    setInstitutionOpen(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/leads")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add New Lead</h1>
          <p className="text-muted-foreground">
            Manually add a new lead to your pipeline
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Organization Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Information
              </CardTitle>
              <CardDescription>
                Basic details about the organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Institution Name with Autocomplete */}
              <FormField
                control={form.control}
                name="institutionName"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Institution Name *</FormLabel>
                    <Popover open={institutionOpen} onOpenChange={setInstitutionOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Input
                            placeholder="e.g., Acme Corporation"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              if (e.target.value.length > 1) {
                                setInstitutionOpen(true);
                              }
                            }}
                          />
                        </FormControl>
                      </PopoverTrigger>
                      {institutions.length > 0 && field.value && (
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search existing institutions..." />
                            <CommandList>
                              <CommandEmpty>No existing institution found.</CommandEmpty>
                              <CommandGroup heading="Existing Institutions">
                                {institutions
                                  .filter((inst) =>
                                    inst.name.toLowerCase().includes(field.value.toLowerCase())
                                  )
                                  .slice(0, 5)
                                  .map((inst) => (
                                    <CommandItem
                                      key={inst.name}
                                      onSelect={() => handleInstitutionSelect(inst)}
                                    >
                                      <div className="flex flex-col">
                                        <span>{inst.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {inst.type} - {inst.state}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      )}
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Institution Type */}
                <FormField
                  control={form.control}
                  name="institutionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Institution Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INSTITUTION_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Department */}
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., IT, Finance, Operations" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* State */}
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {US_STATES.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* County */}
                <FormField
                  control={form.control}
                  name="county"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>County</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Los Angeles" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* City */}
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., San Francisco" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Population */}
                <FormField
                  control={form.control}
                  name="population"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Population</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 500000"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Annual Budget */}
                <FormField
                  control={form.control}
                  name="annualBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Annual Budget</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., $50M" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
              <CardDescription>
                Primary contact details for outreach
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="contact@organization.gov"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone */}
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Website */}
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Website
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://www.organization.gov"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* LinkedIn */}
                <FormField
                  control={form.control}
                  name="linkedinUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Linkedin className="h-4 w-4" />
                        LinkedIn URL
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://linkedin.com/company/..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Twitter */}
              <FormField
                control={form.control}
                name="twitterHandle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Twitter className="h-4 w-4" />
                      Twitter Handle
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="@organization" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Classification & Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Classification & Notes
              </CardTitle>
              <CardDescription>
                Assign to an ICP and add any relevant notes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ICP Assignment */}
              <FormField
                control={form.control}
                name="icpId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ICP Profile</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Auto-assign based on lead data" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Auto-assign</SelectItem>
                        {icpProfiles
                          .filter((icp) => icp.isActive)
                          .map((icp) => (
                            <SelectItem key={icp.id} value={icp.id.toString()}>
                              {icp.displayName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Leave empty to auto-assign based on institution type and location
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any relevant notes about this lead..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Enrich on Save */}
              <FormField
                control={form.control}
                name="enrichOnSave"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-yellow-500" />
                        Enrich on Save
                      </FormLabel>
                      <FormDescription>
                        Automatically fetch company data after creating the lead
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/leads")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createLeadMutation.isPending}
            >
              {createLeadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Create Lead
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
