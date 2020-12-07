/*
 * Copyright 2020 Spotify AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export type Courses = {
  meta: {
    next: string;
    available_course_types: string[];
    library_item_count: number;
  };
  library_items: Course[];
};

export type Tags = {
  meta: {};
  tags: Tag[];
};

export type Tag = {
  id: string;
  name: string;
};

export type Course = {
  id: string;
  item_type: string;
  item_id: string;
  title: string;
  description: string;
  data: {
    has_certificate: boolean;
    passing_threshold: number;
    uuid: string;
    archived_at: string;
    launch_url: string;
    course_type: string;
  };
  estimated_time: string;
  features: string[];
  cover_slide_data: {
    dark: boolean;
    heading: string;
    intro: string;
    background_image_url: string;
  };
  created_at: string;
  updated_at: string;
  is_enrolled: boolean;
  progress: number;
  completed_at: string;
  state: string;
  tags: string[];
  matching_tags: string[];
  relevance: string;
};
