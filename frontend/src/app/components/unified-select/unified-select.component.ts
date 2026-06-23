import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
  inject,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export interface SelectOption {
  value: any;
  label: string;
}

@Component({
  selector: 'app-unified-select',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './unified-select.component.html',
  styleUrl: './unified-select.scss',
})
export class UnifiedSelect {
  @Input() id = `unified-select-${Math.random().toString(36).substring(2, 9)}`;
  @Input() label?: string;
  @Input() options: SelectOption[] = [];
  @Input() value: any;
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<any>();

  isOpen = false;
  private el = inject(ElementRef);

  get selectedLabel(): string {
    const selected = this.options.find(opt => opt.value === this.value);
    return selected ? selected.label : 'Select an option';
  }

  toggleOpen() {
    if (!this.disabled) {
      this.isOpen = !this.isOpen;
    }
  }

  selectOption(option: SelectOption) {
    if (!this.disabled) {
      this.value = option.value;
      this.valueChange.emit(this.value);
      this.isOpen = false;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  onKeyDown(event: KeyboardEvent) {
    if (this.disabled) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleOpen();
    } else if (event.key === 'Escape') {
      this.isOpen = false;
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!this.isOpen) {
        this.isOpen = true;
      } else {
        const index = this.options.findIndex(opt => opt.value === this.value);
        if (index < this.options.length - 1) {
          this.value = this.options[index + 1].value;
          this.valueChange.emit(this.value);
        }
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.isOpen) {
        this.isOpen = true;
      } else {
        const index = this.options.findIndex(opt => opt.value === this.value);
        if (index > 0) {
          this.value = this.options[index - 1].value;
          this.valueChange.emit(this.value);
        }
      }
    }
  }
}
